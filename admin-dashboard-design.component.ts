import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TableRowData } from 'app/_models/row-data.model';
import { UsedFeeSchedule } from 'app/_models/fee-schedule.model';
import { ButtonType, FormControlConfig, HeaderButton, SystemUserBtnType } from 'app/_models/form-control.model';
import { HealthSystem } from 'app/_models/health-system.model';
import { ModifierAdjustment } from 'app/_models/modifier.model';
import { OrgAndHealthSystem, OrgImportSetting, Organization, RegionUser } from 'app/_models/organization.model';
import { Provider } from 'app/_models/provider.model';
import { Specialty } from 'app/_models/specialty.model';
import { TableColumnHeader, TableHeaderButton } from 'app/_models/tables.model';
import { UserDetail } from 'app/_models/user-detail.model';
import { DateFormatService } from 'app/_services/date-format.service';
import { DistributedDataService } from 'app/_services/distributed-data.service';
import { OrganizationService } from 'app/_services/organization.service';
import { UserService } from 'app/_services/user.service';
import { EMPTY, Subject } from 'rxjs';
import { catchError, finalize, map, takeUntil } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { NotifyService } from 'app/_services/notify.service';
import { UserRole } from 'app/_models/user-role.model';
import { RoleKey } from 'app/shared/constants/local-storage-key';
import { IdentityService } from 'app/_services/identity.service';
import { UserInvitation } from 'app/_models/user-invitation.model';
import { FacilityType } from 'app/_models/facility-type.model';
import { OrganizationPractice } from 'app/_models/organization-practice.model';

@Component({
  selector: 'app-admin-dashboard-design',
  templateUrl: './admin-dashboard-design.component.html',
  styleUrls: ['./admin-dashboard-design.component.scss'],
})
export class AdminDashboardDesignComponent implements OnInit {
  public objectKeys = Object.keys;
  public searchText: string;
  public isAddFormActive: boolean = false;
  public isBackBtnVisible: boolean = true;
  public showDialog: boolean;
  public showOrgHealthDialog: boolean;
  public facilityTypeList: FacilityType[] = [
    {
      name: 'ASC',
      id: 'ASC',
    },
    {
      name: 'BHF',
      id: 'BHF',
    },
    {
      name: 'CTAC',
      id: 'CTAC',
    },
    {
      name: 'HHF',
      id: 'HHF',
    },
    {
      name: 'KYC',
      id: 'KYC',
    },
    {
      name: 'LTAC',
      id: 'LTAC',
    },
    {
      name: 'MCRO',
      id: 'MCRO',
    },
    {
      name: 'SNF',
      id: 'SNF',
    },
    {
      name: 'STAC',
      id: 'STAC',
    },
    {
      name: 'URG',
      id: 'URG',
    },
    {
      name: 'WTAC',
      id: 'WTAC',
    },
  ];
  public allowedRolesToAssign: UserDetail[] = [
    { id: RoleKey.Admin, name: 'Admin' },
    { id: RoleKey.OrgUser, name: 'Org User' },
    { id: RoleKey.OrgAdmin, name: 'Org Admin' },
    { id: RoleKey.HealthSystemUser, name: 'Health System User' },
    { id: RoleKey.RegionUser, name: 'Region User' },
    { id: RoleKey.RegionAdmin, name: 'Region Admin' },
  ];
  public sourceSystem = [
    { id: 'isAthenaHealth', name: 'Athena Health' },
    { id: 'epic', name: 'EPIC' }
  ];
  @Input() isLoading: boolean = true;
  @Input() organizations: Organization[] = [];
  @Input() regions: RegionUser[] = [];
  @Input() states;
  @Input() healthSystems: HealthSystem[] = [];
  @Input() activeTabName: string;
  @Input() formData: FormControlConfig[];
  @Input() headerOptions: { headerButtons: HeaderButton[]; headerName: string; label: string };
  @Input() props: {
    columnHeader: TableColumnHeader;
    dataSource: HealthSystem[] | Organization[] | OrganizationPractice[] | Provider[] | UserDetail[] | UsedFeeSchedule[] | ModifierAdjustment[] | Specialty[];
    tableHeaderButton: TableHeaderButton[];
  };
  @Input() formControls: FormControlConfig[] = [];
  @Output() onFormSubmit = new EventEmitter<FormControlConfig>();
  @Output() onUpdateForm = new EventEmitter<FormControlConfig>();
  @Output() onUpdateRegionForm = new EventEmitter<FormControlConfig>();
  @Output() onRegionFormSubmit = new EventEmitter<any>();
  @Output() onOrgImportSetting = new EventEmitter<any>();
  @Output() getOrganizations = new EventEmitter<any>();

  public adminDashboardForm: FormGroup;
  public healthId: string;
  public isEditData: boolean = false;
  public selectedOrganizationId: string;
  public isRegionFormActive: boolean = false;
  public organizationInformation: Organization;
  public showOverviewList: boolean = false;
  public organizationId: string;
  private readonly destroy$ = new Subject();
  public isShowOrgForm: boolean = false;
  public itemPerPage: number = 10;
  public totalPages: number = 0;
  public page: number = 1;
  minEndDate: string;
  minStartDate: string;
  existingObject: TableRowData;
  currentButtonLabel: string;
  public selectedOrgName: string;
  isFeeScheduleAddToo: boolean = false;

  constructor(
    private identityService: IdentityService,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private distributedDataService: DistributedDataService,
    private organizationService: OrganizationService,
    private dateFormatService: DateFormatService,
    private confirmationService: ConfirmationService,
    private notifyService: NotifyService
  ) { }

  ngOnInit(): void {
    if (this.headerOptions?.label == 'User') {
      this.adminDashboardForm.patchValue(this.formData);
      this.adminDashboardForm.disable();
    }
    this.userService.users
      .pipe(
        takeUntil(this.destroy$),
        map((users) => {
          if (this.activeTabName == 'orgUser') {
            this.props.dataSource = [];
            if (users.length > 0) {
              this.props.columnHeader = {
                displayName: 'Name',
                email: 'Email',
                status: 'Status',
              };
              this.props.dataSource = users;
              this.showOverviewList = false;
              this.isLoading = false;
            } else {
              this.isLoading = false;
              this.organizationInformation = null;
              this.showOverviewList = false;
            }
          }
        })
      )
      .subscribe();
  }

  public onTableDataChange(event: number): void {
    this.page = event;
  }

  ngOnDestroy(): void {
    this.userService.clearUsers();
  }

  ngOnChanges(): void {
    this.selectedOrganizationId = this.organizations ? this.organizations[0]?.id : '';
    this.isRegionFormActive = false;
    this.isShowOrgForm = false;
    const formGroupConfig = {};
    this.adminDashboardForm = this.fb.group(formGroupConfig);
    this.formControls?.forEach((controlName) => {
      const validators = controlName.name !== 'effectiveTo' ? [Validators.required] : [];
      this.adminDashboardForm.addControl(controlName.name, this.fb.control('', validators));
    });
    this.isAddFormActive = this.headerOptions?.label == 'User' ? true : false;
    if (this.formControls[0]?.label == 'Region Name') {
      let event = {
        type: 'back',
        visible: false,
      };
      this.getHealthSystemRegions(this.healthId);
      this.performHeaderAction(event);
    } else if (this.headerOptions?.headerName == 'CPT Code') {
      this.getAllCptCode(this.selectedOrganizationId);
    } else if (this.headerOptions?.headerName == 'Modifier') {
      this.getAllModifier(this.selectedOrganizationId);
    }
  }

  public onInputChange(): void {
    this.page = 0;
  }

  public submit(): void {
    if (this.isEditData && !this.isRegionFormActive) {
      this.isBackBtnVisible = true;
      this.onUpdateForm.emit(this.adminDashboardForm.value);
      if (this.headerOptions?.headerName == 'Organizations') {
        this.adminDashboardForm.get('regionId').setValidators(Validators.required);
        this.adminDashboardForm.get('regionId').updateValueAndValidity();
      }
    }
    else if (this.isEditData && this.isRegionFormActive) {
      this.onUpdateRegionForm.emit(this.adminDashboardForm.value);
      this.adminDashboardForm.removeControl('regionName');
      this.adminDashboardForm.reset();
    }
    else if (this.headerOptions?.headerName == 'Import Setting') {
      let data: OrgImportSetting = {
        isAthenaHealth: this.adminDashboardForm.get('sourceSystem').value == 'isAthenaHealth' ? true : false,
        organizationId: this.adminDashboardForm.get('organizationId').value,
        description: this.organizations.find((obj) => obj.id == this.adminDashboardForm.get('organizationId').value)?.name,
        fromDate: this.adminDashboardForm.get('effectiveFrom').value,
        externalPracticeId: this.adminDashboardForm.get('marketId').value,
        ftpFullPathToData: this.adminDashboardForm?.get('ftpFullPathToData')?.value ? this.adminDashboardForm?.get('ftpFullPathToData')?.value : null
      };
      this.onOrgImportSetting.emit(data);
      this.adminDashboardForm.reset();
      this.headerOptions.headerName = 'Organizations';
    }
    else if (this.headerOptions?.headerName == 'Health Systems' && !this.isEditData) {
      const formValue = this.adminDashboardForm.value;
      formValue['isFeeScheduleAddToo'] = this.isFeeScheduleAddToo;
      this.onFormSubmit.emit(formValue);
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
    }
    else if (this.isRegionFormActive) {
      let data = {
        healthSystemId: this.healthId,
        regionName: this.adminDashboardForm?.get('regionName')?.value,
        effectiveFrom: this.adminDashboardForm?.get('effectiveFrom')?.value,
        effectiveTo: this.adminDashboardForm?.get('effectiveTo')?.value ? this.adminDashboardForm?.get('effectiveTo')?.value : null,
      };
      this.onRegionFormSubmit.emit(data);
      this.adminDashboardForm.removeControl('regionName');
      this.adminDashboardForm.reset();
    } else {
      if (this.currentButtonLabel == 'Invite Provider') {
        this.adminDashboardForm.value.role = RoleKey.Provider;
      }
      this.onFormSubmit.emit(this.adminDashboardForm.value);
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
    }
  }

  public onCheckboxChange(event: any): void {
    this.isFeeScheduleAddToo = event.target.checked;
  }

  public back(): void {
    if (this.headerOptions?.headerButtons?.length > 1) {
      this.headerOptions.headerButtons[0].visible = true;
      this.headerOptions.headerButtons[1].visible = false;
    } else if (this.headerOptions?.headerButtons?.length == 1) {
      this.headerOptions.headerButtons[0].visible = true;
    }
    this.isAddFormActive = false;
    this.isBackBtnVisible = true;
    if (this.isRegionFormActive || this.formControls[0]?.label == 'Region Name') {
      this.backRegionToHealthSystem();
    } else if (this.isShowOrgForm) {
      this.backUserToOrganization();
    } else {
      this.router.navigate(['/admin']);
    }
  }

  public performHeaderAction(event: HeaderButton): void {
    this.isEditData = false;
    this.currentButtonLabel = event.buttonLabel;
    this.selectedOrganizationId = this.distributedDataService.getOrganizations()[0].id;
    if (this.headerOptions?.headerName == 'Providers') {
      this.headerOptions.headerButtons[0].visible = false;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
      this.getAllProviders(this.selectedOrganizationId);
    }
    else if (event?.type == 'add' && this.headerOptions.headerName == 'Organizations') {
      this.formControls = [
        { name: 'name', label: 'Name', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'effectiveFrom', label: 'Effective From', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'npi', label: 'NPI', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'effectiveTo', label: 'Effective To', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'facilityType', label: 'Organization Type', isDropdown: true, dropdownOptions: this.facilityTypeList, isVisible: false, isSwitch: false },
        { name: 'state', label: 'State', isDropdown: true, dropdownOptions: this.states, isVisible: false, isSwitch: false },
        { name: 'address', label: 'Address', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'regionId', label: 'Region', isDropdown: true, dropdownOptions: this.regions, isVisible: false, isSwitch: false },
        { name: 'city', label: 'City', isDropdown: false, isVisible: false, isSwitch: false },
      ];
      this.formControls.forEach((controlName) => {
        this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
      });
      this.headerOptions.headerButtons[0].visible = false;  //hide  AddOrgBtn
      this.headerOptions.headerButtons[1].visible = false;  //hide  AddImportRecordBtn
      this.headerOptions.headerButtons[2].visible = true;   //show  BackBtn
      this.isAddFormActive = true;
      this.isBackBtnVisible = false;
      this.showOverviewList = false;
    }
    else if (event?.type == 'import') {
      this.clearAllFieldValidator();
      this.formControls = [];
      this.headerOptions.headerName = 'Import Setting';
      this.formControls = [
        { name: 'sourceSystem', label: 'Source System', isDropdown: true, dropdownOptions: this.sourceSystem, isVisible: false, isSwitch: false },
        { name: 'organizationId', label: 'Organization', isDropdown: true, dropdownOptions: this.organizations, isVisible: false, isSwitch: false },
        { name: 'effectiveFrom', label: 'From Date', isDropdown: false, isVisible: false, isSwitch: false },
        { name: 'marketId', label: 'Market ID', isDropdown: false, isVisible: false, isSwitch: false },
      ];
      this.formControls.forEach((controlName) => {
        this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
      });
      this.headerOptions.headerButtons[0].visible = false; //hide  AddOrgBtn
      this.headerOptions.headerButtons[1].visible = false; //hide  AddImportRecordBtn
      this.headerOptions.headerButtons[2].visible = true; //show  BackBtn
      this.isAddFormActive = true;
      this.isBackBtnVisible = false;
      this.showOverviewList = false;
    }
    else if (event?.type == 'back' && this.headerOptions?.headerName == 'Modifier') {
      this.headerOptions.headerButtons[0].visible = true;
      this.headerOptions.headerButtons[1].visible = false;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.getAllModifier(this.organizations[0]?.id);
    } else if (event?.type == 'back' && this.headerOptions?.headerName == 'CPT Code') {
      this.headerOptions.headerButtons[0].visible = true;
      this.headerOptions.headerButtons[1].visible = false;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.getAllCptCode(this.organizations[0]?.id);
    } else if (event?.type == 'add' && this.headerOptions.headerName == 'Manage User') {
      this.clearAllFieldValidator();
      if (event.buttonLabel == 'Invite Provider') {
        this.formControls = [
          { name: 'email', label: 'Email', isDropdown: false, isVisible: false, isSwitch: false },
          { name: 'organizationId', label: 'Organization', isDropdown: true, dropdownOptions: this.organizations, isVisible: false, isSwitch: false },
          { name: 'providerId', label: 'Provider', isDropdown: true, dropdownOptions: [], isVisible: false, isSwitch: false },
        ];
      } else {
        this.formControls = [
          { name: 'role', label: 'Role', isDropdown: true, dropdownOptions: this.allowedRolesToAssign, isVisible: true, isSwitch: false },
          { name: 'email', label: 'Email', isDropdown: false, isVisible: false, isSwitch: false },
        ];
      }
      this.formControls.forEach((controlName) => {
        if (event.buttonLabel == 'Invite User' && controlName.name == 'email') {
          this.adminDashboardForm.addControl(
            controlName.name,
            this.fb.control('', {
              validators: [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-z]{2,4}$'), this.userExistsValidator()],
            })
          );
        } else {
          this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
        }
      });
      event.buttonLabel == 'Invite Provider' ? this.adminDashboardForm.get('providerId').disable() : '';
      this.headerOptions.headerButtons[SystemUserBtnType.BackButton].visible = true;
      this.headerOptions.headerButtons[SystemUserBtnType.InviteUserBtn].visible = false;
      this.headerOptions.headerButtons[SystemUserBtnType.InviteProviderBtn].visible = false;
      this.isAddFormActive = true;
      this.isBackBtnVisible = false;
    } else if (event?.type == 'add') {
      this.isRegionFormActive = this.currentButtonLabel == 'Add Region' ? true : false;
      this.headerOptions.headerButtons[1].visible = true;
      this.headerOptions.headerButtons[0].visible = false;
      this.isAddFormActive = true;
      this.isBackBtnVisible = false;
      this.showOverviewList = false;
    } else if (event?.type == 'back' && this.headerOptions.headerName == 'Manage User') {
      this.checkControlExists();
      this.headerOptions.headerButtons[SystemUserBtnType.BackButton].visible = false;
      this.headerOptions.headerButtons[SystemUserBtnType.InviteUserBtn].visible = true;
      this.headerOptions.headerButtons[SystemUserBtnType.InviteProviderBtn].visible = true;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
      this.isLoading = true;
      this.userService
        .getSystemUsersByRole(RoleKey.Admin)
        .pipe(
          map((data) => {
            if (data) {
              this.isLoading = false;
              this.getSystemUserNameById(data);
            } else {
              this.isLoading = false;
              this.getSystemUserNameById(data);
            }
          })
        )
        .subscribe();
    } else if (event?.type == 'back' && this.headerOptions.headerName == 'Organizations') {
      this.adminDashboardForm.get('regionId').setValidators(Validators.required);
      this.adminDashboardForm.get('regionId').updateValueAndValidity();
      this.headerOptions.headerButtons[0].visible = true;  //show  AddOrgBtn
      this.headerOptions.headerButtons[1].visible = true;  //show  AddImportRecordBtn
      this.headerOptions.headerButtons[2].visible = false; //hide  BackBtn
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
    }
    else if (event?.type == 'back' && this.headerOptions.headerName == 'Import Setting') {
      this.formControls = [];
      this.headerOptions.headerName = 'Organizations';
      this.headerOptions.headerButtons[0].visible = true; //show  AddOrgBtn
      this.headerOptions.headerButtons[1].visible = true;  //show  AddImportRecordBtn
      this.headerOptions.headerButtons[2].visible = false;  //show  BackBtn
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
    }
    else if (event?.type == 'back' && this.isRegionFormActive) {
      this.headerOptions.headerButtons[0].visible = true;
      this.headerOptions.headerButtons[1].visible = false;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.props.tableHeaderButton = [
        {
          buttonLabel: 'Regions',
          tab: 'tab1',
          tabName: 'regions',
          active: true,
        },
        {
          buttonLabel: 'Users',
          tab: 'tab2',
          tabName: 'users',
          active: false,
        },
      ];
      this.adminDashboardForm.reset();
      this.getHealthSystemRegions(this.healthId);
    } else if (event?.type == 'back') {
      this.headerOptions.headerButtons[0].visible = true;
      this.headerOptions.headerButtons[1].visible = false;
      this.isAddFormActive = false;
      this.isBackBtnVisible = true;
      this.adminDashboardForm.reset();
    }
  }

  public checkControlExists(): void {
    this.formControls.forEach((control) => {
      this.adminDashboardForm?.removeControl(control.name);
    });
    this.formControls = [];
  }

  public getHealthSystemRegions(id: string) {
    this.isLoading = true;
    this.props.dataSource = [];
    this.organizationService
      .getHealthSystemRegion(id)
      .pipe(
        map((region) => {
          if (region.length > 0) {
            this.isLoading = false;
            this.props.columnHeader = {
              id: 'Id',
              name: 'Name',
              createdBy: 'Created By',
              createdDate: 'Created Date',
              effectiveFrom: 'Effective From',
              effectiveTo: 'Effective To',
              action: 'Action'
            };
            region.forEach((element) => {
              element.createdDate = this.dateFormatService.formatDate(element.createdDate);
              element.effectiveFrom = this.dateFormatService.formatDate(element.effectiveFrom);
              element.effectiveTo = this.dateFormatService.formatDate(element.effectiveTo);
            });
            this.props.dataSource = region;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  public onTableRowClick(event: TableColumnHeader): void {
    if (this.headerOptions?.headerName == 'Organizations') {
      this.isShowOrgForm = true;
      this.isBackBtnVisible = true;
      this.organizationId = event.id;
      this.showOverviewList = true;
      this.headerOptions.headerName = event.name;
      this.props.tableHeaderButton = [
        {
          buttonLabel: 'Overview',
          tab: 'tab1',
          tabName: 'overview',
          active: true,
        },
        {
          buttonLabel: 'Users',
          tab: 'tab2',
          tabName: 'orgUser',
          active: false,
        },
      ];
      this.props.dataSource = [];
      this.headerOptions.headerButtons[0].visible = false; //hide  AddOrganizationBtn
      this.headerOptions.headerButtons[1].visible = false; //hide  DatXNPportSettingBtn
      this.getOrganizationOverView(event.id);
    } else if (this.headerOptions?.headerName == 'Health Systems') {
      this.healthId = event.healthSystemId;
      this.isBackBtnVisible = true;
      this.headerOptions.headerName = event.healthSystemName;
      this.props.tableHeaderButton = [
        {
          buttonLabel: 'Regions',
          tab: 'tab1',
          tabName: 'regions',
          active: true,
        },
        {
          buttonLabel: 'Users',
          tab: 'tab2',
          tabName: 'users',
          active: false,
        },
      ];
      this.addRegionFormControl();
      this.getHealthSystemRegions(this.healthId);
    }
    const tab1Element = document.getElementById('tab1') as HTMLElement;
    if (tab1Element) {
      const anchorElement = tab1Element.querySelector('a');
      if (anchorElement) {
        const labelText = anchorElement.textContent || anchorElement.innerText;
        if (labelText == 'Regions' && tab1Element?.classList?.contains('active')) {
          this.props.tableHeaderButton.push({
            buttonLabel: 'Organizations',
            tab: 'tab3',
            active: true,
          });
          let item = {
            tab: '3',
          };
          this.onTabClick(item);
          this.isLoading = true;
          this.headerOptions.headerButtons[0].visible = false;
          this.getRegionOrganizations(event.id);
        }
      }
    }
  }

  public editRowData(data: TableRowData): void {
    if (this.headerOptions?.headerName == 'Manage User') {
      this.showDialog = true;
      this.existingObject = data;
      this.cdr.detectChanges();
    } else {
      this.isEditData = true;
      this.isAddFormActive = true;
      this.isBackBtnVisible = false;
      this.headerOptions.headerButtons[0].visible = true;
      if (this.headerOptions?.headerName == 'Specialties') {
        this.adminDashboardForm.addControl('id', new FormControl(data.id));
        this.adminDashboardForm.patchValue(data);
        this.headerOptions.headerButtons[1].visible = true;
        this.headerOptions.headerButtons[0].visible = false;
      }
      else if (this.isRegionFormActive) {
        this.headerOptions.headerButtons[0].visible = false; // hide AddRegionBtn
        this.headerOptions.headerButtons[1].visible = true;  // show BackBtn
        this.adminDashboardForm.addControl('regionId', new FormControl(data.id));
        this.adminDashboardForm.addControl('healthSystemId', new FormControl(this.healthId));
        data.effectiveFrom = data.effectiveFrom?.split("/").reverse().join("-");
        data.effectiveTo = data.effectiveTo?.split("/").reverse().join("-");
        if (this.adminDashboardForm.get('regionName') == null) {
          this.adminDashboardForm.addControl('regionName', new FormControl());
        }
        this.adminDashboardForm.get('regionName').setValue(data.name);
        this.adminDashboardForm.get('effectiveFrom').patchValue(data.effectiveFrom ? data.effectiveFrom : null);
        this.adminDashboardForm.get('effectiveTo').setValue(data.effectiveTo ? data.effectiveTo : null);
      }
      else if (this.headerOptions?.headerName == 'Organizations') {
        this.headerOptions.headerButtons[0].visible = false; //hide  AddOrgBtn
        this.headerOptions.headerButtons[1].visible = false; //hide  AddImportRecordBtn
        this.headerOptions.headerButtons[2].visible = true;  //show  BackBtn
        if (this.formControls.length == 0) {
          this.formControls = [
            { name: 'name', label: 'Name', isDropdown: false, isVisible: false, isSwitch: false },
            { name: 'effectiveFrom', label: 'Effective From', isDropdown: false, isVisible: false, isSwitch: false },
            { name: 'npi', label: 'NPI', isDropdown: false, isVisible: false, isSwitch: false },
            { name: 'effectiveTo', label: 'Effective To', isDropdown: false, isVisible: false, isSwitch: false },
            { name: 'facilityType', label: 'Organization Type', isDropdown: true, dropdownOptions: this.facilityTypeList, isVisible: false, isSwitch: false },
            { name: 'state', label: 'State', isDropdown: true, dropdownOptions: [], isVisible: false, isSwitch: false },
            { name: 'address', label: 'Address', isDropdown: false, isVisible: false, isSwitch: false },
            { name: 'regionId', label: 'Region', isDropdown: true, dropdownOptions: [], isVisible: false, isSwitch: false },
            { name: 'city', label: 'City', isDropdown: false, isVisible: false, isSwitch: false },
          ];
          this.formControls.forEach((controlName) => {
            this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
          });
        }
        this.adminDashboardForm.addControl('id', new FormControl(data.id));
        this.adminDashboardForm.get('regionId')?.clearValidators();
        this.adminDashboardForm.get('regionId')?.updateValueAndValidity();
        this.adminDashboardForm.get('primaryUserPhone')?.clearValidators();
        this.adminDashboardForm.get('primaryUserPhone')?.updateValueAndValidity();
        this.cdr.detectChanges();
        data.effectiveFrom = data.effectiveFrom?.split('T')[0];
        data.effectiveTo = data.effectiveTo?.split('T')[0];
        this.adminDashboardForm.patchValue(data);
      }
      else if (this.headerOptions?.headerName == 'Health Systems') {
        this.headerOptions.headerButtons[ButtonType.AddButton].visible = false;
        this.headerOptions.headerButtons[ButtonType.BackButton].visible = true;
        this.adminDashboardForm.addControl('healthSystemId', new FormControl(data.healthSystemId));
        this.adminDashboardForm.patchValue(data);
      }
      else {
        this.adminDashboardForm.addControl('id', new FormControl(data.id));
        this.adminDashboardForm.addControl('organizationId', new FormControl(data.organizationId));
        this.adminDashboardForm.patchValue(data);
      }
    }
  }

  public onTabClick(item: TableHeaderButton): void {
    this.page = 0;
    if (item?.tabName != undefined) {
      this.props.dataSource = [];
    }
    let allTabs = document.querySelectorAll('.nav-item');
    allTabs.forEach((tab) => {
      tab?.classList?.remove('active');
    });
    let clickedTab = document.getElementById(item.tab);
    clickedTab?.classList?.add('active');
    this.activeTabName = item.tabName;
    if (item.tabName == 'unknownProviders') {
      this.getUnknownProvider(this.selectedOrganizationId);
    } else if (item.tabName == 'allProviders') {
      this.getAllProviders(this.selectedOrganizationId);
    } else if (item.tabName == 'allSpecialty') {
      if (!this.props.columnHeader.action) {
        this.props.columnHeader.action = 'Action';
      }
      this.props.dataSource = [];
      this.organizationService
        .getAllSpecialties()
        .pipe(
          map((data) => {
            if (data) {
              this.props.dataSource = data;
            }
          })
        )
        .subscribe();
    } else if (item.tabName == 'orgUser') {
      this.isLoading = true;
      this.userService
        .fetchUsers(this.organizationId)
        .pipe(
          catchError((e) => {
            return EMPTY;
          })
        )
        .subscribe();
    } else if (item.tabName == 'users') {
      this.headerOptions.headerButtons[0].visible = false;
      this.props.tableHeaderButton.length > 2 ? this.props.tableHeaderButton.splice(2, 1) : '';
      this.isLoading = true;
      this.userService
        .getHealthSystemUsers(this.healthId)
        .pipe(
          map((health) => {
            this.props.columnHeader = {
              displayName: 'Name',
              email: 'Email',
              statusDate: 'Status Date',
              status: 'Status',
            };
            if (health.length > 0) {
              this.isLoading = false;
              this.props.dataSource = health;
            } else {
              this.isLoading = false;
            }
          })
        )
        .subscribe();
    } else if (item.tabName == 'regions') {
      this.headerOptions.headerButtons[0].visible = true;
      this.isRegionFormActive = true;
      this.props.tableHeaderButton.length > 2 ? this.props.tableHeaderButton.splice(2, 1) : '';
      this.getHealthSystemRegions(this.healthId);
    } else if (item.tabName == 'overview') {
      this.showOverviewList = true;
      this.isLoading = true;
      this.getOrganizationOverView(this.organizationId);
    } else if (this.headerOptions?.headerName == 'Manage User') {
      this.isLoading = true;
      this.userService
        .getSystemUsersByRole(item.tabName)
        .pipe(
          map((data) => {
            if (data) {
              this.isLoading = false;
              this.getSystemUserNameById(data);
            } else {
              this.isLoading = false;
              this.getSystemUserNameById(data);
            }
          })
        )
        .subscribe();
    }
  }

  public getOrgData(id: string): void {
    this.selectedOrganizationId = id;
    if (this.activeTabName == 'unknownProviders') {
      this.getUnknownProvider(this.selectedOrganizationId);
    } else if (this.activeTabName == 'allProviders') {
      this.getAllProviders(this.selectedOrganizationId);
    } else if (this.headerOptions?.headerName == 'System Users') {
      this.userService
        .fetchUsers(this.selectedOrganizationId)
        .pipe(
          catchError((e) => {
            return EMPTY;
          })
        )
        .subscribe();
    } else if (this.headerOptions?.headerName == 'CPT Code') {
      this.headerOptions.headerButtons[0].visible = true;
      this.getAllCptCode(id);
    } else {
      this.headerOptions.headerButtons[0].visible = true;
      this.props.dataSource = [];
      this.getAllModifier(id);
    }
  }

  public addRegionFormControl(): void {
    this.isRegionFormActive = true;
    this.headerOptions.headerButtons[0].buttonLabel = 'Add Region';
    this.formControls = [];
    this.adminDashboardForm.removeControl('healthSystemName');
    this.formControls.push(
      { name: 'regionName', label: 'Region Name', isDropdown: false, isVisible: false, isSwitch: false },
      { name: 'effectiveFrom', label: 'Effective From', isDropdown: false, isVisible: false, isSwitch: false },
      { name: 'effectiveTo', label: 'Effective To', isDropdown: false, isVisible: false, isSwitch: false }
    );
    this.formControls?.forEach((controlName) => {
      const validators = controlName.name !== 'effectiveTo' ? [Validators.required] : [];
      this.adminDashboardForm.addControl(controlName.name, this.fb.control('', validators));
    });
  }

  public backUserToOrganization(): void {
    this.isShowOrgForm = false;
    this.showOverviewList = false;
    this.props.tableHeaderButton = [];
    this.headerOptions.headerButtons[1].visible = true; //show Data Import SettingBtn
    this.isRegionFormActive = false;
    this.headerOptions.headerName = 'Organizations';
    this.isLoading = true;
    this.organizationService
      .getOrganizationDetailList()
      .pipe(
        map((data) => {
          if (data) {
            this.isLoading = false;
            data.forEach((element) => {
              element.createdDate = this.dateFormatService.formatDate(element.createdDate);
            });
            this.props.columnHeader = {
              npi: 'NPI',
              name: 'Name',
              state: 'State',
              address: 'Address',
              createdDate: 'Created',
              action: 'Action'
            };
            this.props.dataSource = data;
          } else {
            this.isLoading = false;
            this.props.dataSource = [];
          }
        })
      )
      .subscribe();
  }

  public backRegionToHealthSystem(): void {
    this.props.tableHeaderButton = [];
    this.isRegionFormActive = false;
    this.headerOptions.headerName = 'Health Systems';
    this.headerOptions.headerButtons[0].buttonLabel = 'Add Health System';
    this.formControls = [];
    this.adminDashboardForm.reset();
    this.adminDashboardForm.removeControl('regionName');
    this.adminDashboardForm.removeControl('effectiveFrom');
    this.adminDashboardForm.removeControl('effectiveTo');
    this.formControls.push(
      { name: 'healthSystemName', label: 'Name', isDropdown: false, isVisible: false, isSwitch: false },
    );
    this.formControls.forEach((controlName) => {
      this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
    });
    this.isLoading = true;
    this.organizationService
      .getHealthSystem()
      .pipe(
        map((data: HealthSystem[]) => {
          if (data) {
            this.isLoading = false;
            this.props.columnHeader = {
              healthSystemId: 'Health System Id',
              healthSystemName: 'Name',
              createdBy: 'Created By',
              createdDate: 'Created Date',
              action: 'Action'
            };
            data.forEach((element) => {
              element.createdDate = this.dateFormatService.formatDate(element.createdDate);
            });
            this.props.dataSource = data;
          } else {
            this.isLoading = false;
            this.props.dataSource = [];
          }
        })
      )
      .subscribe();
  }

  public getOrganizationOverView(id: string): void {
    this.isLoading = true;
    this.organizationService.getOrganizationDetail(id).subscribe(
      (response: Organization) => {
        if (response) {
          this.isLoading = false;
          this.organizationInformation = response;
          this.organizationInformation.createdDate = this.dateFormatService.formatDate(this.organizationInformation.createdDate);
          this.organizationInformation.modifiedDate = this.dateFormatService.formatDate(this.organizationInformation.modifiedDate);
          this.showOverviewList = true;
        }
      },
      (error) => {
        console.error(error);
      }
    );
  }

  public getUnknownProvider(id: string): void {
    this.isLoading = true;
    this.organizationService
      .getUnknownProviders(id)
      .pipe(
        map((data) => {
          if (data.length > 0) {
            this.isLoading = false;
            this.props.dataSource = data;
            this.selectedOrganizationId = id;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  public getAllProviders(id: string): void {
    this.isLoading = true;
    this.organizationService
      .getProviders(id)
      .pipe(
        map((data) => {
          if (data) {
            this.props.dataSource = data;
            this.isLoading = false;
            this.selectedOrganizationId = id;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  public getSystemUserNameById(data: UserDetail[]): void {
    if (this.activeTabName == 'RegionUser' || this.activeTabName == 'RegionAdmin') {
      this.props.columnHeader = {
        displayName: 'Name',
        email: 'Email',
        role: 'Role',
        name: 'Region Name',
        status: 'Status',
        action: 'Action',
      };
      data?.map((item) => {
        const regionName = this.regions.find((obj) => obj.regionId === item.regionId);
        item.name = regionName ? regionName.regionName : null;
      });
      this.props.dataSource = data ? data : [];
    } else if (this.activeTabName == 'Provider' || this.activeTabName == 'OrgUser' || this.activeTabName == 'OrgAdmin') {
      this.props.columnHeader = {
        displayName: 'Name',
        email: 'Email',
        role: 'Role',
        name: 'Organization Name',
        status: 'Status',
        action: 'Action',
      };
      data?.map((item) => {
        const orgName = this.organizations.find((obj) => obj.id === item.organizationId);
        item.name = orgName ? orgName.name : null;
      });
      this.props.dataSource = data ? data : [];
    } else if (this.activeTabName == 'HealthSystemUser') {
      this.props.columnHeader = {
        displayName: 'Name',
        email: 'Email',
        role: 'Role',
        name: 'HealthSystem Name',
        status: 'Status',
        action: 'Action',
      };
      data?.map((item) => {
        const healthSystem = this.healthSystems.find((obj) => obj.healthSystemId === item.healthSystemId);
        item.name = healthSystem ? healthSystem.healthSystemName : null;
      });
      this.props.dataSource = data ? data : [];
    } else {
      this.props.columnHeader = {
        displayName: 'Name',
        email: 'Email',
        role: 'Role',
        status: 'Status',
        action: 'Action',
      };
      this.props.dataSource = data ? data : [];
    }
  }

  public getAllModifier(orgId: string): void {
    this.isLoading = true;
    this.organizationService
      .getModifierAdjusmentList(orgId)
      .pipe(
        map((data) => {
          if (data) {
            this.props.dataSource = data;
            this.isLoading = false;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  public getRegionOrganizations(id: string): void {
    this.organizationService
      .getRegionOrganization(id)
      .pipe(
        map((orgRegion) => {
          if (orgRegion.length > 0) {
            this.isLoading = false;
            this.props.columnHeader = {
              name: 'Name',
              createdBy: 'Created By',
              createdDate: 'Created Date',
            };
            orgRegion.forEach((element) => {
              element.createdDate = this.dateFormatService.formatDate(element.createdDate);
            });
            this.props.dataSource = orgRegion;
          } else {
            this.isLoading = false;
            this.props.dataSource = [];
          }
        })
      )
      .subscribe();
  }

  public getAllCptCode(orgId: string): void {
    this.isLoading = true;
    this.organizationService
      .getAllCptCodes(orgId)
      .pipe(
        map((data) => {
          if (data.length > 0) {
            this.isLoading = false;
            data.forEach((element) => {
              element.effectiveFrom = this.dateFormatService.formatDate(element.effectiveFrom);
            });
            this.props.dataSource = data;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  deleteRowData(userObject: UserDetail): void {
    if (this.headerOptions?.headerName == 'Organizations') {
      this.confirmationService.confirm({
        message: 'Are you sure, you want to delete this organization?',
        header: userObject.name,
        icon: 'fa fa-exclamation-triangle fa-2x text-danger',
        acceptButtonStyleClass: 'bg-success',
        rejectButtonStyleClass: 'bg-danger',
        accept: () => {
          this.revokeOrganization(userObject.id);
        },
      });
    } else {
      this.confirmationService.confirm({
        message: 'Are you sure, you want to delete role for this user?',
        header: userObject.displayName ? userObject.displayName : userObject.name,
        icon: 'fa fa-exclamation-triangle fa-2x text-danger',
        acceptButtonStyleClass: 'bg-success',
        rejectButtonStyleClass: 'bg-danger',
        accept: () => {
          userObject.status == 'Invited' ? this.revokeInvitation(userObject.id) : this.revokeRole(userObject.id);
        },
      });
    }
  }

  public clearCurrentSelection(): void {
    this.searchText = '';
    this.isLoading = true;
    this.showDialog = false;
    this.userService
      .getSystemUsersByRole(this.activeTabName)
      .pipe(
        map((data) => {
          if (data) {
            this.isLoading = false;
            this.getSystemUserNameById(data);
          } else {
            this.isLoading = false;
            this.getSystemUserNameById(data);
          }
        })
      )
      .subscribe();
  }

  public onSelectOption(value, label): void {
    if (
      this.headerOptions.headerName == 'Manage User' &&
      this.currentButtonLabel == 'Invite User' &&
      (value == 'OrgUser' || value == 'Admin' || value == 'OrgAdmin' || value == 'RegionUser' || value == 'RegionAdmin' || value == 'HealthSystemUser')
    ) {
      this.healthSystems.forEach((element) => {
        element.id = element.healthSystemId;
        element.name = element.healthSystemName;
      });
      this.regions.forEach((element) => {
        element.id = element.regionId;
        element.name = element.regionName;
      });
      const existingDropdownIndex = this.formControls.findIndex((control) => control.name == 'HealthSystemId' || control.name == 'regionId' || control.name == 'organizationId');
      if (existingDropdownIndex !== -1) {
        const removedControl = this.formControls.splice(existingDropdownIndex, 1)[0];
        this.adminDashboardForm.removeControl(removedControl.name);
      }
      if (value == 'OrgUser' || value == 'OrgAdmin') {
        this.formControls.push({ name: 'organizationId', label: 'Organization', isDropdown: true, dropdownOptions: this.organizations, isVisible: false, isSwitch: false });
        this.formControls.forEach((controlName) => {
          this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
        });
      } else if (value == 'RegionUser' || value == 'RegionAdmin') {
        this.formControls.push({ name: 'regionId', label: 'Region', isDropdown: true, dropdownOptions: this.regions, isVisible: false, isSwitch: false });
        this.formControls.forEach((controlName) => {
          this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
        });
      } else if (value == 'HealthSystemUser') {
        this.formControls.push({ name: 'HealthSystemId', label: 'HealthSystem Name', isDropdown: true, dropdownOptions: this.healthSystems, isVisible: false, isSwitch: false });
        this.formControls.forEach((controlName) => {
          this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
        });
      }
    } else if (this.currentButtonLabel == 'Invite Provider') {
      if (label == 'organizationId') {
        this.adminDashboardForm.get('providerId').enable();
        this.organizationService
          .getProviderIdentifiers(value)
          .pipe(
            map((data) => {
              if (data.length > 0) {
                this.formControls.forEach((control) => {
                  if (control.label == 'Provider') {
                    control.dropdownOptions = data;
                  }
                });
              }
            })
          )
          .subscribe();
      }
    }
    else if (value == 'epic') {
      this.formControls.push({ name: 'ftpFullPathToData', label: 'FTP Path', isDropdown: false, isVisible: false, isSwitch: false });
      this.formControls.forEach((controlName) => {
        this.adminDashboardForm.addControl(controlName.name, this.fb.control('', Validators.required));
      });
    }
    else if (value == 'isAthenaHealth') {
      this.adminDashboardForm.removeControl('ftpFullPathToData');
      this.formControls.forEach((element, index) => {
        if (element.name == "ftpFullPathToData") {
          this.formControls.splice(index, 1);
        }
      });
    }
  }

  private revokeInvitation(invitationId: string | number): void {
    this.userService
      .revokeInvitation(invitationId)
      .pipe(
        map(() => this.notifyService.success('Invitation revoked')),
        catchError(async (e) => this.notifyService.error('Error revoking invitation')),
        finalize(() => this.clearCurrentSelection())
      )
      .subscribe();
  }

  private revokeRole(roleId: string | number): void {
    this.userService
      .revokeRole(roleId)
      .pipe(
        map(() => this.notifyService.success('User role revoked')),
        catchError(async (e) => this.notifyService.error('Error revoking user role')),
        finalize(() => this.clearCurrentSelection())
      )
      .subscribe();
  }

  private revokeOrganization(orgId: string | number): void {
    this.organizationService
      .revokeOrganization(orgId)
      .pipe(
        map((resp) => {
          if (resp['isSuccessful']) {
            this.notifyService.success(resp['message']);
            this.getOrganizations.emit();
          } else {
            this.notifyService.error(resp['message']);
          }
        }),
        catchError(async (e) => this.notifyService.error('Error revoking organization'))
      )
      .subscribe();
  }

  public updateUserRole(userObject: UserDetail): void {
    this.existingObject.status == 'Invited' ? this.updateInvitation(userObject) : this.updateRole(userObject);
  }

  public switchOrgHS(regionObject): void {
    const OrganizationHealthSystem: OrgAndHealthSystem = {
      regionId: regionObject.regionId,
      organizationId: this.organizationId,
      effectiveFrom: regionObject.effectiveFrom,
      effectiveTo: regionObject.effectiveTo,
    };
    this.organizationService
      .switchOrgHealthSystem(OrganizationHealthSystem, regionObject.healthSystemId)
      .pipe(
        map((resp) => {
          resp['isSuccessful'] ? this.notifyService.success(resp['message']) : this.notifyService.error(resp['message']);
          this.getOrganizations.emit();
        }),
        catchError(async (e) => this.notifyService.error('Error'))
      )
      .subscribe();
  }

  private updateInvitation(existingInvite: UserDetail) {
    this.switchActiveTab(existingInvite.role);
    const newInvite: UserInvitation = {
      email: this.existingObject.email,
      organizationId: existingInvite.organizationId,
      role: existingInvite.role,
      providerId: null,
      regionId: existingInvite.regionId,
      healthSystemId: existingInvite.healthSystemId,
    };
    this.userService
      .updateInvitation(this.existingObject.id, newInvite)
      .pipe(
        catchError(async (e) => this.notifyService.error('Error updating invitation')),
        finalize(() => this.clearCurrentSelection())
      )
      .subscribe();
  }

  private updateRole(existingRole: UserDetail): void {
    this.switchActiveTab(existingRole.role);
    const roleClXNP: UserRole = {
      organizationId: existingRole.organizationId,
      role: existingRole.role,
      providerId: null,
      regionId: existingRole.regionId,
      healthSystemId: existingRole.healthSystemId,
    };
    this.userService
      .updateRole(this.existingObject, roleClXNP)
      .pipe(
        catchError(async (e) => this.notifyService.error('Error updating user role')),
        finalize(() => this.clearCurrentSelection())
      )
      .subscribe();
  }

  public clearAllFieldValidator(): void {
    const formControls = Object.keys(this.adminDashboardForm.controls);
    formControls.forEach((controlName) => {
      this.adminDashboardForm.removeControl(controlName);
    });
    this.adminDashboardForm.reset();
    this.adminDashboardForm.updateValueAndValidity();
  }

  public switchActiveTab(roleName: string): void {
    let activeTab = this.props?.tableHeaderButton.find((item) => item.tabName == roleName)?.tab;
    let allTabs = document.querySelectorAll('.nav-item');
    allTabs.forEach((tab) => {
      tab?.classList?.remove('active');
    });
    let clickedTab = document.getElementById(activeTab);
    clickedTab?.classList?.add('active');
    this.activeTabName = roleName;
  }

  public isEmailValid() {
    if (this.currentButtonLabel == 'Invite User' && this.adminDashboardForm?.get('email')?.value == this.identityService.getUsername()) {
      const emailControl = this.adminDashboardForm.get('email');
      // Set the error for the 'invalidCondition' key
      emailControl?.setErrors({ invalidCondition: true });
      this.cdr.detectChanges();
      return true;
    }
  }

  public shouldHideControl(controlName: string): boolean {
    // Add your condition here to determine if the control should be hidden
    if (this.headerOptions?.headerName == 'Organizations' && this.isEditData) return controlName === 'primaryUserPhone' || controlName === 'regionId';
  }

  public onStartDateChange(): void {
    this.minEndDate = this.adminDashboardForm.get('effectiveFrom').value;
    this.adminDashboardForm?.controls?.effectiveTo?.enable();
  }

  public orgHealthDialog(data): void {
    this.showOrgHealthDialog = true;
    this.organizationId = data.id;
    this.selectedOrgName = data.name;
    this.cdr.detectChanges();
  }

  getToDateWithGap(effectiveFrom: Date): string {
    const closeDayOfMonth = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), 90);
    const convertDate = closeDayOfMonth.toISOString().slice(0, 10);
    return convertDate;
  }

  private userExistsValidator =
    (): ValidatorFn =>
      (control: AbstractControl): { [key: string]: boolean } | null => {
        const userExists = this.adminDashboardForm?.get('email')?.value == this.identityService.getUsername() ? { userExists: true } : null;
        return userExists;
      };
}
