import { UserManagement, UserAccountStatus } from '../../types';
import { BMCSheetConfigItem } from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';

export const USER_MANAGEMENT_SHEET_CONFIG: BMCSheetConfigItem<UserManagement> = {
  spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY',
  sectionKey: 'userManagement',
  sheetName: 'People', // Reusing the People sheet or creating a dedicated one
  gid: '1401300909',
  headerRow: 1,
  isSimpleList: false,
  fieldToHeaderMap: {
    id: 'user_id',
    fullName: 'full_name',
    email: 'email',
    role: 'role_title',
    department: 'department',
    hub: 'primary_hub_name',
    status: 'status',
    lastLogin: 'last_login',
    permissions: 'permissions'
  },
  transform: (key: keyof UserManagement, value: string) => {
    if (key === 'status') return mapToEnum(value, UserAccountStatus);
    return value;
  },
};