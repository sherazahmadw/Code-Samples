using AutoMapper;
using CsvHelper;
using CB.FileMappingRules.Models;
using CB.Import.Reporting.Domain.DTOs;
using CB.Import.Reporting.Domain.Interfaces;
using CB.Import.Reporting.Domain.Models;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CB.Import.Reporting.Domain.Reporting
{
    public class ImportLogsReportingService : IImportLogsReportingService
    {
        private readonly IImportReportQueryableRepository _repository;

        public ImportLogsReportingService(IImportReportQueryableRepository repository)
        {
            _repository = repository;
        }

        public async Task ExportToCsvAsync(Stream stream, ExportCsvSettings exportCsvSettings, CancellationToken cancellationToken)
        {
            using (var textWriter = new StreamWriter(stream, new UTF8Encoding(false), bufferSize: 1024, leaveOpen: true))
            {
                using (var csvWriter = new CsvWriter(textWriter, CultureInfo.InvariantCulture, leaveOpen: true))
                {
                    var parameter = exportCsvSettings.Parameter;
                    var CBSecurityHeader = exportCsvSettings.CBSecurityHeader;
                    var fileTypes = exportCsvSettings.FileTypes;

                    var filter = new ExportDataFilter
                    {
                        Facilities = await _repository.GetFacilityListAsync((int)parameter.CeCBId, CBSecurityHeader),
                        Parameter = parameter
                    };

                    await WriteFiltersToCsvAsync(csvWriter, filter, fileTypes, exportCsvSettings.isFacilitiesFilterApplied);
                    csvWriter.Context.RegisterClassMap<ImportLogsDtoCsvDataMapper>();
                    csvWriter.WriteHeader<ImportLogsDto>();
                    await csvWriter.NextRecordAsync();
                    await csvWriter.FlushAsync();

                    try
                    {
                        await _repository.ExportImportLogsAsync(filter, row =>
                        {
                            var record = Mapper.Map<Models.ImportLog, ImportLogsDto>(row);
                            csvWriter.WriteRecord(record);
                            csvWriter.NextRecord();
                        }, cancellationToken);
                    }
                    catch
                    {
                        await csvWriter.FlushAsync();
                        textWriter.WriteLine();
                        textWriter.WriteLine("Export failed due to internal error. Please contact customer support.");
                        textWriter.Flush();
                        throw;
                    }

                    await csvWriter.FlushAsync();
                }
            }
        }

        private async Task WriteFiltersToCsvAsync(CsvWriter csvWriter, 
            ExportDataFilter exportDatafilter, 
            IEnumerable<CBFileType> fileTypes,
            bool isFacilitiesFilterApplied
            )
        {
            csvWriter.WriteField("Filter(s) applied:");
            var parameters = exportDatafilter.Parameter;

            var fileImportStateConverter = new FileImportStateConverter();
            var reportStates = parameters.ReportStates
                .Select(s => fileImportStateConverter.ConvertToString(s, null, null))
                .ToList();
            reportStates.Sort();

            var facilities = exportDatafilter.Facilities
                .Where(f => parameters.Facilities != null && parameters.Facilities.Contains(f.FacilityId))
                .Select(f => f?.Name)
                .Where(n => n != null)
                .ToList();
            facilities.Sort();

            var fileTypeNames = fileTypes
                .Where(f => parameters.FileTypes != null && parameters.FileTypes.Contains(f.Id))
                .Select(f => f?.Name)
                .Where(n => n != null)
                .ToList();
            fileTypeNames.Sort();

            if (reportStates.Any())
            {
                var appliedfilters = string.Join(", ", reportStates);
                csvWriter.WriteField("Status: " + appliedfilters);
                await CsvWriteFiltersSeparatorAsync(csvWriter);
            }

            if (facilities.Any() && isFacilitiesFilterApplied)
            {
                csvWriter.WriteField("Facility: " + string.Join(", ", facilities));
                await CsvWriteFiltersSeparatorAsync(csvWriter);
            }

            if (parameters.FromDate != null && parameters.ToDate != null)
            {
                var dateRange = string.Join(" to ", parameters.FromDate?.ToString("dd MMM yyyy"), parameters.ToDate?.ToString("dd MMM yyyy"));
                csvWriter.WriteField("Date range: " + dateRange);
                await CsvWriteFiltersSeparatorAsync(csvWriter);
            }

            if (fileTypeNames.Any())
            {
                csvWriter.WriteField("File type: " + string.Join(", ", fileTypeNames));
                await CsvWriteFiltersSeparatorAsync(csvWriter);
            }

            await csvWriter.NextRecordAsync();
            await csvWriter.NextRecordAsync();
            await csvWriter.FlushAsync();
        }

        private async Task CsvWriteFiltersSeparatorAsync(CsvWriter csvWriter)
        {
            await csvWriter.NextRecordAsync();
            csvWriter.WriteField("");
        }
    }
}
