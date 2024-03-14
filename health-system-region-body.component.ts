import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { HealthSystem, HealthSystemReport, HealthSystemReportData, OrganizationsProductivity, ProvidersProductivity } from 'app/_models/health-system.model';
import { Organization, RegionUser, UserRegionsAndOrgs } from 'app/_models/organization.model';
import { DistributedDataService } from 'app/_services/distributed-data.service';
import { IdentityService } from 'app/_services/identity.service';
import { NotifyService } from 'app/_services/notify.service';
import { ReportsService } from 'app/_services/reports.service';
import { EMPTY, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { VerticalBarChartComponent } from '../vertical-bar-chart/vertical-bar-chart.component';
import { RoleKey } from 'app/shared/constants/local-storage-key';
import { Colors } from 'app/shared/constants/colors';
import { Arrays } from 'app/shared/constants/arrays';

@Component({
  selector: 'app-health-system-region-system-body',
  templateUrl: './health-system-region-body.component.html',
  styleUrls: ['./health-system-region-body.component.scss'],
})
export class HealthSystemRegionBodyComponent implements OnInit, OnDestroy {
  public regions: RegionUser[];
  public allOrganizations: Organization[];
  public organizations: Organization[];
  public currentDate = new Date();
  public healthSystemForm: FormGroup;
  public alertMessage: string;
  public showAlert: boolean;
  public isLoading: boolean = true;
  public showModal: boolean = false;
  public pieChartColorScheme: { 'domain': string[] } = Colors.pieChartColorScheme;
  public verticalChartColorScheme: { 'domain': string[] } = Colors.verticalChartColorScheme;
  public providersByDesignation: HealthSystemReportData[];
  public workRvusPercentageByDesignation: HealthSystemReportData[];
  public workRvusPercentageBySpecialty: HealthSystemReportData[];
  public averageWorkRvusBySpecialty: HealthSystemReportData[];
  public regionWorkRvusPercentageBySpecialty: { key: string; value: HealthSystemReportData[] }[];
  public filterRegionWorkRvusPercentageBySpecialty: { key: string; value: HealthSystemReportData[] }[];
  public totalProviders: number = 0;
  public providersProductivityByRegionsAndOrgs: ProvidersProductivity[];
  public organizationsProductivity: OrganizationsProductivity[];
  public totalCompensation: number | string = 0;
  public view: number[];
  public healthSystemModalData: { list: HealthSystemReportData[]; header: string; isRegionRole?: boolean };
  public role: string;
  public regionId: number;
  public healthSystemId: number;
  public healthSystemHierarchies: UserRegionsAndOrgs[];
  public currentHierarchy: UserRegionsAndOrgs;
  private reportSubscription: Subscription;
  public minDate: Date = Arrays.minDate;
  public maxDate: Date = Arrays.maxDate;
  public calendarYearRange: string;
  private healthSystemReportSubject$: Subject<any> = new Subject();
  private report$ = this.healthSystemReportSubject$.pipe(
    switchMap((params) => {
      return this.reportService.getProvidersStatusForHealthSystem(params)
    }),
    catchError((err) => {
      this.notifyService.error('Something went wrong. Please try again and if needed, Contact Support. Error: ' + err?.status);
      this.reportSubscription = this.report$.subscribe((report) => this.displayReport(report));
      this.isLoading = false;
      return EMPTY;
    })
  );
  isShowFeeSchedule: boolean = false;

  constructor(
    private distributedDataService: DistributedDataService,
    private fb: FormBuilder,
    private reportService: ReportsService,
    private identityService: IdentityService,
    private notifyService: NotifyService
  ) {}
  ngOnInit(): void {
    this.initializeForm();
    this.resizeChart();
    this.calendarYearRange = Arrays.getYearsRange()
    this.role = this.identityService.getUserRole();
    this.healthSystemId= this.identityService.getHealthSystemId();
    this.regionId= this.identityService.getRegionId();
    if(this.role === RoleKey.Admin)
    {
      this.distributedDataService.getUserData()?.filter(resp => {
        if (resp.healthSystem.healthSystemId === this.healthSystemId || resp?.regions?.some(r => r.regionId === this.regionId)) {
          this.healthSystemHierarchies = [resp];
        }
      })
    }
    else         
    {
      this.healthSystemHierarchies = this.distributedDataService.getUserData();
    }
  
    this.identifyUserRole();
    this.reportSubscription = this.report$.subscribe((report) => this.displayReport(report));
    this.getHealthSystemProvider();
    this.detectChangesOnHealthSystemForm();
  }

  public initializeForm(): void {
    this.healthSystemForm = this.fb.group({
      region: ['all', Validators.required],
      organization: ['all', Validators.required],
      startDate: [new Date(this.currentDate.getFullYear(), 0, 1), Validators.required],
      endDate: [this.getLastDateOfMonth(new Date()), Validators.required],
    });
  }

  public identifyUserRole(): void {
       this.currentHierarchy =  this.healthSystemHierarchies[0];
    if (this.healthSystemId) {
      this.regions = this.currentHierarchy.regions;
      this.allOrganizations = this.currentHierarchy.organizations;
      this.organizations = this.allOrganizations;
    } else if (this.regionId) {
      this.regions = this.currentHierarchy.regions?.filter(resp => resp.regionId === this.regionId)
      this.allOrganizations = this.currentHierarchy.organizations?.filter(resp => resp.regionId ===this.regionId)
      this.organizations = this.allOrganizations
      this.regionFormControl.setValue(this.regionId);
    }
    this.organizations = this.organizations?.sort((a: Organization, b: Organization) => a.name.localeCompare(b.name));
  }

  onDateSelect(event: Date): void {
    this.healthSystemForm.get('endDate').setValue(this.getLastDateOfMonth(event));
  }

  public getLastDateOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  public getCurrentDateFormatted(date: Date) {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  public showErrorMessage(message: string): void {
    this.alertMessage = message;
    this.hideAlertDiv();
  }

  public hideAlertDiv(): void {
    this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 1000);
  }

  public detectChangesOnHealthSystemForm(): void {
    this.regionFormControl.valueChanges.subscribe((region) => {
      if (region !== 'all') {
        this.organizations = this.allOrganizations?.filter((resp) => resp?.regionId === +region);
        this.organizations?.some((resp) => resp?.id === this.healthSystemForm.value.organization) ? '' : this.healthSystemForm.get('organization').setValue('all');
      } else {
        this.organizations = this.allOrganizations;
      }
    });
    this.healthSystemForm.valueChanges.pipe(debounceTime(500)).subscribe((resp) => {
      if (new Date(resp.endDate) < new Date(resp.startDate)) {
        this.showErrorMessage('Start date should be less than end date');
        return;
      }
      this.isLoading = true;
      this.getHealthSystemProvider();
    });
  }

  public filterRegionWorkRvus(): void {
    if (this.regionWorkRvusPercentageBySpecialty?.length < this.regions.length && this.regionFormControl.value === 'all') {
      this.regions.forEach((resp) => {
        if (!this.regionWorkRvusPercentageBySpecialty?.some((obj) => obj.key === resp.regionName)) {
          this.regionWorkRvusPercentageBySpecialty.push({ key: resp.regionName, value: [] });
        }
      });
    } else if (this.regionWorkRvusPercentageBySpecialty?.length === 0 && this.regionFormControl.value !== 'all') {
      this.regionWorkRvusPercentageBySpecialty.push({ key: this.regions?.find((resp) => resp.regionId == this.healthSystemForm.value.region)?.regionName, value: [] });
    }
    this.filterRegionWorkRvusPercentageBySpecialty = [];
    this.regionWorkRvusPercentageBySpecialty?.forEach((resp) => {
      let allValue = (resp.value = resp.value.sort((a, b) => b.value - a.value));
      if (resp?.value.length < 7) {
        this.filterRegionWorkRvusPercentageBySpecialty.push(resp);
      } else {
        this.filterRegionWorkRvusPercentageBySpecialty.push({ key: resp.key, value: resp.value.slice(0, 7) });
        this.filterRegionWorkRvusPercentageBySpecialty[this.filterRegionWorkRvusPercentageBySpecialty?.length - 1].value.push({
          name: 'Other',
          value: 100 - allValue.slice(0, 7).reduce((sum, obj) => sum + obj.value, 0) + 3,
        });
      }
    });
  }

  public showHealthSystemModal(data: { list: HealthSystemReportData[]; header: string; isRegionRole: boolean }): void {
    this.healthSystemModalData = data;
    this.showModal = true;
  }

  public organizationProductivity(): void {
    this.organizationsProductivity = [];
    let filterProvidersProductivityByRegions = [];
    if (this.regions.length > 1 && this.providersProductivityByRegionsAndOrgs?.length) {
      this.regions.forEach((resp) => {
        if (!this.providersProductivityByRegionsAndOrgs?.some((item) => item?.regionName === resp?.regionName)) {
          filterProvidersProductivityByRegions?.push({ name: resp?.regionName, value: 0 });
        } else {
          let findItem = this.providersProductivityByRegionsAndOrgs?.find((item) => item?.regionName === resp?.regionName);
          filterProvidersProductivityByRegions?.push({ name: findItem?.regionName, value: findItem?.regionProvidersTotalCompensation, label: findItem?.organizationsProductivity });
          this.organizationsProductivity.push(...findItem.organizationsProductivity);
          this.totalCompensation =  +this.totalCompensation + findItem?.regionProvidersTotalCompensation;
        }
      });
    } else if (this.regions.length === 1 && this.providersProductivityByRegionsAndOrgs?.length) 
    {
      filterProvidersProductivityByRegions = [
        { name: 'Productivity', value: this.providersProductivityByRegionsAndOrgs[0]?.regionProvidersProductivity },
        { name: 'Base Salary', value: this.providersProductivityByRegionsAndOrgs[0]?.regionProvidersBaseSalary }      ];
      this.organizationsProductivity.push(...this.providersProductivityByRegionsAndOrgs[0]?.organizationsProductivity);
      this.totalCompensation =   +this.totalCompensation + this.providersProductivityByRegionsAndOrgs[0]?.regionProvidersTotalCompensation;
    }
    this.totalCompensation = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(+this.totalCompensation);
    this.providersProductivityByRegionsAndOrgs = filterProvidersProductivityByRegions;
  }

  public getHealthSystemProvider(): void {
    let data: HealthSystem = {
      healthSystemId: this.currentHierarchy?.healthSystem ? this.healthSystemId ? this.healthSystemId : this.currentHierarchy?.healthSystem?.healthSystemId : 0,
      regionId: this.healthSystemForm.value.region === 'all' ? '' : this.healthSystemForm.value.region,
      organizationId: this.healthSystemForm.value.organization === 'all' ? '' : this.healthSystemForm.value.organization,
      allOrganizations: this.healthSystemForm.value.organization === 'all' ? true : false,
      allRegions: this.healthSystemForm.value.region === 'all' ? true : false,
      startDate: this.getCurrentDateFormatted(this.healthSystemForm.value.startDate),
      endDate: this.getCurrentDateFormatted(this.healthSystemForm.value.endDate),
    };
    this.totalProviders = 0;
    this.totalCompensation = 0;
    VerticalBarChartComponent.lastindex = [];
    this.healthSystemReportSubject$.next(data);
  }
  public fromCamelCaseToWords(camelCaseString: string): string {
    return camelCaseString?.split(/(?=[A-Z])/).join(' ');
  }

  public displayReport(report: HealthSystemReport): void {
    this.totalProviders = report.header.totalProviders;
    this.providersByDesignation = report.body?.providersByDesignation;
    this.workRvusPercentageByDesignation = report.body?.workRvusPercentageByDesignation;
    this.workRvusPercentageBySpecialty = report.body?.workRvusPercentageBySpecialty;
    this.averageWorkRvusBySpecialty = report.body?.averageWorkRvusBySpecialty;
    this.providersProductivityByRegionsAndOrgs = report?.body.providersProductivityByRegionsAndOrgs;
    this.regionWorkRvusPercentageBySpecialty = report.body?.regionWorkRvusPercentageBySpecialty;
    this.filterRegionWorkRvus();
    this.organizationProductivity();
    this.isLoading = false;
  }

  public onSelect(event: HealthSystemReportData, key: string): void {
    if (event.name === 'Other') {
      this.showHealthSystemModal({
        list: this.regionWorkRvusPercentageBySpecialty.find((resp) => resp.key === key).value,
        header: 'Region wRVUs Percentage By Specialty',
        isRegionRole: false,
      });
    }
  }

  public setLabelFormatting(name: string): string {
    let item = this.series?.find((resp) => resp?.name === name);
    if (item.name !== 'Other') {
      return ` ${item?.name?.slice(0, 7)}  : ${item?.value?.toString()?.slice(0, 4)}%`;
    } else {
      return item.name;
    }
  }

  private resizeChart(): void {
    if (innerWidth <= 768) {
      this.view = [innerWidth / 1.6, 340];
    } else {
      this.view = [innerWidth / 3.7, 340];
    }
  }

  series = [
    {
      name: 'No Active',
      value: 100,
      label: '(100%)',
    },
  ];
  public responsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1,
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  get regionFormControl(): FormControl {
    return this.healthSystemForm.get('region') as FormControl;
  }

  public manageFeeSchedule(): void {
    this.identityService.changeCurrentOrganization('');
    this.isShowFeeSchedule = true;
  }

  back(): void {
    this.isShowFeeSchedule = false;
  }

  ngOnDestroy(): void {
    this.reportSubscription.unsubscribe();
  }
}
