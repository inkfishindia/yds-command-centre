
import useSWR from 'swr';
import { fetchValues } from '../lib/sheets';
import { bmcRegistry } from '../lib/dataRegistry';

const PICKLIST_NAMES = [
  'status_values', 'build_status_values', 'bu_type_values', 'channel_type_values', 
  'sales_motion_values', 'support_model_values', 'order_status_values', 
  'payment_mode_values', 'fulfillment_status_values', 'shipping_type_values', 
  'print_method_values', 'garment_size_values', 'gender_fit_values', 
  'material_values', 'packaging_type_values', 'tax_slab_values', 
  'discount_type_values', 'coupon_type_values', 'utm_source_values', 
  'user_role_values', 'partner_tier_values', 'priority_values', 
  'severity_values', 'task_status_values', 'country_values', 
  'currency_values', 'boolean_values'
];

const picklistFetcher = async (key: string, spreadsheetId: string) => {
    const lists: Record<string, string[]> = {};
    const missing: string[] = [];

    await Promise.all(PICKLIST_NAMES.map(async (rangeName) => {
        try {
            const response = await fetchValues(spreadsheetId, rangeName);
            if (response.values && response.values.length > 0) {
                lists[rangeName] = response.values.flat().filter(Boolean);
            } else {
                missing.push(rangeName);
            }
        } catch (error) {
            console.warn(`Could not fetch picklist named range: ${rangeName}`, error);
            missing.push(rangeName);
        }
    }));

    return { lists, missing };
};

export const usePicklists = () => {
    const validationSpec = bmcRegistry.validation;
    const spreadsheetId = validationSpec.spreadsheetId;

    const { data, error, isLoading } = useSWR(
        spreadsheetId ? ['picklists', spreadsheetId] : null,
        ([key, id]) => picklistFetcher(key, id),
        { revalidateOnFocus: false }
    );

    return {
        picklists: data?.lists || {},
        missingPicklists: data?.missing || [],
        isLoadingPicklists: isLoading,
        picklistsError: error,
    };
};
