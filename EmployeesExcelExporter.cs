using System.Collections.Generic;
using Npg.Runtime.Session;
using Npg.Timing.Timezone;
using XNP.DataExporting.Excel.MiniExcel;
using XNP.Employees.Dtos;
using XNP.Dto;
using XNP.Storage;

namespace XNP.Employees.Exporting
{
    public class EmployeesExcelExporter : MiniExcelExcelExporterBase, IEmployeesExcelExporter
    {

        private readonly ITimeZoneConverter _timeZoneConverter;
        private readonly INpgSession _NpgSession;

        public EmployeesExcelExporter(
            ITimeZoneConverter timeZoneConverter,
            INpgSession NpgSession,
            ITempFileCacheManager tempFileCacheManager) :
    base(tempFileCacheManager)
        {
            _timeZoneConverter = timeZoneConverter;
            _NpgSession = NpgSession;
        }

        public FileDto ExportToFile(List<GetEmployeeForViewDto> employees)
        {

            var items = new List<Dictionary<string, object>>();

            foreach (var employee in employees)
            {
                items.Add(new Dictionary<string, object>()
                    {
                        {L("Name"), employee.Employee.Name},

                    });
            }

            return CreateExcelPackage("EmployeesList.xlsx", items);

        }
    }
}