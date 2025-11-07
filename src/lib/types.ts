export type POIMethod = "11" | "12"; // 11=static, 12=dynamic

// Fix: Add more optional fields to AddlData for various sub-tags of Tag 62.
export type AddlData = {
    purpose?: string; // 62/08
    billNumber?: string; // 62/01
    mobileNumber?: string; // 62/02
    storeLabel?: string; // 62/03
    referenceLabel?: string; // 62/05
    terminalLabel?: string; // 62/07
};

export type MAI28 = {
    bic: string; // Hardcoded to CBETETAA
    accountOrPhone: string;
    guid?: string; // Auto-generated
};

export type BuildParams = {
    poiMethod: POIMethod;
    merchantName: string;
    merchantCity: string;
    countryCode?: "ET";
    currency?: "230";
    mcc?: string;
    amount?: string;
    mai28: MAI28;
    addl?: AddlData;
};

// Fix: Add and export IQrFormData to resolve import error in QrCodeGenerator.
export interface IQrFormData {
    pfi: string;
    poiMethod: string;
    mcc: string;
    transactionCurrency: string;
    transactionAmount: string;
    countryCode: string;
    merchantName: string;
    merchantCity: string;
    mai_ips_et_guid: string;
    mai_ips_et_bic: string;
    mai_ips_et_merchant_account: string;
    additional_billNumber: string;
    additional_mobileNumber: string;
    additional_storeLabel: string;
    additional_referenceLabel: string;
    additional_terminalLabel: string;
}
