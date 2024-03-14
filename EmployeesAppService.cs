using XNP.Locations;

using System;
using System.Linq;
using System.Linq.Dynamic.Core;
using Npg.Linq.Extensions;
using System.Collections.Generic;
using System.Threading.Tasks;
using Npg.Domain.Repositories;
using XNP.Employees.Exporting;
using XNP.Employees.Dtos;
using XNP.Dto;
using Npg.Application.Services.Dto;
using XNP.Authorization;
using Npg.Extensions;
using Npg.Authorization;
using Microsoft.EntityFrameworkCore;
using Npg.UI;
using XNP.Storage;

namespace XNP.Employees
{
    [NpgAuthorize(AppPermissions.Pages_Employees)]
    public class EmployeesAppService : XNPAppServiceBase, IEmployeesAppService
    {
        private readonly IRepository<Employee> _employeeRepository;
        private readonly IEmployeesExcelExporter _employeesExcelExporter;
        private readonly IRepository<Location, int> _lookup_locationRepository;

        public EmployeesAppService(IRepository<Employee> employeeRepository, IEmployeesExcelExporter employeesExcelExporter, IRepository<Location, int> lookup_locationRepository)
        {
            _employeeRepository = employeeRepository;
            _employeesExcelExporter = employeesExcelExporter;
            _lookup_locationRepository = lookup_locationRepository;

        }

        public virtual async Task<PagedResultDto<GetEmployeeForViewDto>> GetAll(GetAllEmployeesInput input)
        {

            var filteredEmployees = _employeeRepository.GetAll()
                        .Include(e => e.LocationFk)
                        .WhereIf(!string.IsNullOrWhiteSpace(input.Filter), e => false || e.Name.Contains(input.Filter))
                        .WhereIf(!string.IsNullOrWhiteSpace(input.NameFilter), e => e.Name.Contains(input.NameFilter))
                        .WhereIf(!string.IsNullOrWhiteSpace(input.LocationNameFilter), e => e.LocationFk != null && e.LocationFk.Name == input.LocationNameFilter);

            var pagedAndFilteredEmployees = filteredEmployees
                .OrderBy(input.Sorting ?? "id asc")
                .PageBy(input);

            var employees = from o in pagedAndFilteredEmployees
                            join o1 in _lookup_locationRepository.GetAll() on o.LocationId equals o1.Id into j1
                            from s1 in j1.DefaultIfEmpty()

                            select new
                            {

                                o.Name,
                                Id = o.Id,
                                LocationName = s1 == null || s1.Name == null ? "" : s1.Name.ToString()
                            };

            var totalCount = await filteredEmployees.CountAsync();

            var dbList = await employees.ToListAsync();
            var results = new List<GetEmployeeForViewDto>();

            foreach (var o in dbList)
            {
                var res = new GetEmployeeForViewDto()
                {
                    Employee = new EmployeeDto
                    {

                        Name = o.Name,
                        Id = o.Id,
                    },
                    LocationName = o.LocationName
                };

                results.Add(res);
            }

            return new PagedResultDto<GetEmployeeForViewDto>(
                totalCount,
                results
            );

        }

        public virtual async Task<GetEmployeeForViewDto> GetEmployeeForView(int id)
        {
            var employee = await _employeeRepository.GetAsync(id);

            var output = new GetEmployeeForViewDto { Employee = ObjectMapper.Map<EmployeeDto>(employee) };

            if (output.Employee.LocationId != null)
            {
                var _lookupLocation = await _lookup_locationRepository.FirstOrDefaultAsync((int)output.Employee.LocationId);
                output.LocationName = _lookupLocation?.Name?.ToString();
            }

            return output;
        }

        [NpgAuthorize(AppPermissions.Pages_Employees_Edit)]
        public virtual async Task<GetEmployeeForEditOutput> GetEmployeeForEdit(EntityDto input)
        {
            var employee = await _employeeRepository.FirstOrDefaultAsync(input.Id);

            var output = new GetEmployeeForEditOutput { Employee = ObjectMapper.Map<CreateOrEditEmployeeDto>(employee) };

            if (output.Employee.LocationId != null)
            {
                var _lookupLocation = await _lookup_locationRepository.FirstOrDefaultAsync((int)output.Employee.LocationId);
                output.LocationName = _lookupLocation?.Name?.ToString();
            }

            return output;
        }

        public virtual async Task CreateOrEdit(CreateOrEditEmployeeDto input)
        {
            if (input.Id == null)
            {
                await Create(input);
            }
            else
            {
                await Update(input);
            }
        }

        [NpgAuthorize(AppPermissions.Pages_Employees_Create)]
        protected virtual async Task Create(CreateOrEditEmployeeDto input)
        {
            var employee = ObjectMapper.Map<Employee>(input);

            if (NpgSession.TenantId != null)
            {
                employee.TenantId = (int?)NpgSession.TenantId;
            }

            await _employeeRepository.InsertAsync(employee);

        }

        [NpgAuthorize(AppPermissions.Pages_Employees_Edit)]
        protected virtual async Task Update(CreateOrEditEmployeeDto input)
        {
            var employee = await _employeeRepository.FirstOrDefaultAsync((int)input.Id);
            ObjectMapper.Map(input, employee);

        }

        [NpgAuthorize(AppPermissions.Pages_Employees_Delete)]
        public virtual async Task Delete(EntityDto input)
        {
            await _employeeRepository.DeleteAsync(input.Id);
        }

        public virtual async Task<FileDto> GetEmployeesToExcel(GetAllEmployeesForExcelInput input)
        {

            var filteredEmployees = _employeeRepository.GetAll()
                        .Include(e => e.LocationFk)
                        .WhereIf(!string.IsNullOrWhiteSpace(input.Filter), e => false || e.Name.Contains(input.Filter))
                        .WhereIf(!string.IsNullOrWhiteSpace(input.NameFilter), e => e.Name.Contains(input.NameFilter))
                        .WhereIf(!string.IsNullOrWhiteSpace(input.LocationNameFilter), e => e.LocationFk != null && e.LocationFk.Name == input.LocationNameFilter);

            var query = (from o in filteredEmployees
                         join o1 in _lookup_locationRepository.GetAll() on o.LocationId equals o1.Id into j1
                         from s1 in j1.DefaultIfEmpty()

                         select new GetEmployeeForViewDto()
                         {
                             Employee = new EmployeeDto
                             {
                                 Name = o.Name,
                                 Id = o.Id
                             },
                             LocationName = s1 == null || s1.Name == null ? "" : s1.Name.ToString()
                         });

            var employeeListDtos = await query.ToListAsync();

            return _employeesExcelExporter.ExportToFile(employeeListDtos);
        }

        [NpgAuthorize(AppPermissions.Pages_Employees)]
        public async Task<List<EmployeeLocationLookupTableDto>> GetAllLocationForTableDropdown()
        {
            return await _lookup_locationRepository.GetAll()
                .Select(location => new EmployeeLocationLookupTableDto
                {
                    Id = location.Id,
                    DisplayName = location == null || location.Name == null ? "" : location.Name.ToString()
                }).ToListAsync();
        }

    }
}