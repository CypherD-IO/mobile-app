export interface BannerRecord {
    pk: string;
    sk: number;
    id: string;
    title: string;
    description: string;
    bgImageURI?: string;
    redirectURI?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
    startDate: string,
    endDate: string,
    isClosable: boolean
}