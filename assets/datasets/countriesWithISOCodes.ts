const countriesWithISOCodes = [
  {
    name: 'Afghanistan',
    Iso2: 'AF',
    Iso3: 'AFG',
  },
  // {
  //   name: 'Albania',
  //   Iso2: 'AL',
  //   Iso3: 'ALB'
  // },
  {
    name: 'Algeria',
    Iso2: 'DZ',
    Iso3: 'DZA',
  },
  {
    name: 'Andorra',
    Iso2: 'AD',
    Iso3: 'AND',
  },
  {
    name: 'Angola',
    Iso2: 'AO',
    Iso3: 'AGO',
  },
  {
    name: 'Anguilla',
    Iso2: 'AI',
    Iso3: 'AIA',
  },
  {
    name: 'Antigua and Barbuda',
    Iso2: 'AG',
    Iso3: 'ATG',
  },
  {
    name: 'Argentina',
    Iso2: 'AR',
    Iso3: 'ARG',
  },
  {
    name: 'Armenia',
    Iso2: 'AM',
    Iso3: 'ARM',
  },
  {
    name: 'Aruba',
    Iso2: 'AW',
    Iso3: 'ABW',
  },
  {
    name: 'Australia',
    Iso2: 'AU',
    Iso3: 'AUS',
  },
  {
    name: 'Austria',
    Iso2: 'AT',
    Iso3: 'AUT',
  },
  {
    name: 'Azerbaijan',
    Iso2: 'AZ',
    Iso3: 'AZE',
  },
  {
    name: 'Bahamas',
    Iso2: 'BS',
    Iso3: 'BHS',
  },
  {
    name: 'Bahrain',
    Iso2: 'BH',
    Iso3: 'BHR',
  },
  {
    name: 'Bangladesh',
    Iso2: 'BD',
    Iso3: 'BGD',
  },
  {
    name: 'Barbados',
    Iso2: 'BB',
    Iso3: 'BRB',
  },
  // {
  //   name: 'Belarus',
  //   Iso2: 'BY',
  //   Iso3: 'BLR'
  // },
  {
    name: 'Belgium',
    Iso2: 'BE',
    Iso3: 'BEL',
  },
  {
    name: 'Belize',
    Iso2: 'BZ',
    Iso3: 'BLZ',
  },
  {
    name: 'Benin',
    Iso2: 'BJ',
    Iso3: 'BEN',
  },
  {
    name: 'Bermuda',
    Iso2: 'BM',
    Iso3: 'BMU',
  },
  {
    name: 'Bhutan',
    Iso2: 'BT',
    Iso3: 'BTN',
  },
  // {
  //   name: 'Bosnia and Herzegovina',
  //   Iso2: 'BA',
  //   Iso3: 'BIH'
  // },
  {
    name: 'Botswana',
    Iso2: 'BW',
    Iso3: 'BWA',
  },
  {
    name: 'Bouvet Island',
    Iso2: 'BV',
    Iso3: 'BVT',
  },
  {
    name: 'Brazil',
    Iso2: 'BR',
    Iso3: 'BRA',
  },
  {
    name: 'British Indian Ocean Territory',
    Iso2: 'IO',
    Iso3: 'IOT',
  },
  {
    name: 'Brunei',
    Iso2: 'BN',
    Iso3: 'BRN',
  },
  {
    name: 'Bulgaria',
    Iso2: 'BG',
    Iso3: 'BGR',
  },
  {
    name: 'Burkina Faso',
    Iso2: 'BF',
    Iso3: 'BFA',
  },
  // {
  //   name: 'Burundi',
  //   Iso2: 'BI',
  //   Iso3: 'BDI'
  // },
  {
    name: 'Cambodia',
    Iso2: 'KH',
    Iso3: 'KHM',
  },
  {
    name: 'Cameroon',
    Iso2: 'CM',
    Iso3: 'CMR',
  },
  {
    name: 'Canada',
    Iso2: 'CA',
    Iso3: 'CAN',
  },
  {
    name: 'Cape Verde',
    Iso2: 'CV',
    Iso3: 'CPV',
  },
  {
    name: 'Cayman Islands',
    Iso2: 'KY',
    Iso3: 'CYM',
  },
  // {
  //   name: 'Central African Republic',
  //   Iso2: 'CF',
  //   Iso3: 'CAF'
  // },
  {
    name: 'Chad',
    Iso2: 'TD',
    Iso3: 'TCD',
  },
  {
    name: 'Chile',
    Iso2: 'CL',
    Iso3: 'CHL',
  },
  {
    name: 'China',
    Iso2: 'CN',
    Iso3: 'CHN',
  },
  {
    name: 'Christmas Island',
    Iso2: 'CX',
    Iso3: 'CXR',
  },
  {
    name: 'Cocos (Keeling) Islands',
    Iso2: 'CC',
    Iso3: 'CCK',
  },
  {
    name: 'Colombia',
    Iso2: 'CO',
    Iso3: 'COL',
  },
  {
    name: 'Comoros',
    Iso2: 'KM',
    Iso3: 'COM',
  },
  // {
  //   name: 'Congo',
  //   Iso2: 'CG',
  //   Iso3: 'COG'
  // },
  {
    name: 'Cook Islands',
    Iso2: 'CK',
    Iso3: 'COK',
  },
  {
    name: 'Costa Rica',
    Iso2: 'CR',
    Iso3: 'CRI',
  },
  {
    name: 'Croatia',
    Iso2: 'HR',
    Iso3: 'HRV',
  },
  // {
  //   name: 'Cuba',
  //   Iso2: 'CU',
  //   Iso3: 'CUB'
  // },
  // {
  //   name: 'Cyprus',
  //   Iso2: 'CY',
  //   Iso3: 'CYP'
  // },
  {
    name: 'Czech Republic',
    Iso2: 'CZ',
    Iso3: 'CZE',
  },
  {
    name: 'Denmark',
    Iso2: 'DK',
    Iso3: 'DNK',
  },
  {
    name: 'Djibouti',
    Iso2: 'DJ',
    Iso3: 'DJI',
  },
  {
    name: 'Dominica',
    Iso2: 'DM',
    Iso3: 'DMA',
  },
  {
    name: 'Dominican Republic',
    Iso2: 'DO',
    Iso3: 'DOM',
  },
  {
    name: 'Ecuador',
    Iso2: 'EC',
    Iso3: 'ECU',
  },
  {
    name: 'Egypt',
    Iso2: 'EG',
    Iso3: 'EGY',
  },
  {
    name: 'El Salvador',
    Iso2: 'SV',
    Iso3: 'SLV',
  },
  {
    name: 'Equatorial Guinea',
    Iso2: 'GQ',
    Iso3: 'GNQ',
  },
  {
    name: 'Eritrea',
    Iso2: 'ER',
    Iso3: 'ERI',
  },
  {
    name: 'Estonia',
    Iso2: 'EE',
    Iso3: 'EST',
  },
  {
    name: 'Ethiopia',
    Iso2: 'ET',
    Iso3: 'ETH',
  },
  {
    name: 'Falkland Islands',
    Iso2: 'FK',
    Iso3: 'FLK',
  },
  {
    name: 'Faroe Islands',
    Iso2: 'FO',
    Iso3: 'FRO',
  },
  {
    name: 'Fiji',
    Iso2: 'FJ',
    Iso3: 'FJI',
  },
  {
    name: 'Finland',
    Iso2: 'FI',
    Iso3: 'FIN',
  },
  {
    name: 'France',
    Iso2: 'FR',
    Iso3: 'FRA',
  },
  {
    name: 'French Polynesia',
    Iso2: 'PF',
    Iso3: 'PYF',
  },
  {
    name: 'Gabon',
    Iso2: 'GA',
    Iso3: 'GAB',
  },
  {
    name: 'Gambia',
    Iso2: 'GM',
    Iso3: 'GMB',
  },
  {
    name: 'Georgia',
    Iso2: 'GE',
    Iso3: 'GEO',
  },
  {
    name: 'Germany',
    Iso2: 'DE',
    Iso3: 'DEU',
  },
  {
    name: 'Ghana',
    Iso2: 'GH',
    Iso3: 'GHA',
  },
  {
    name: 'Gibraltar',
    Iso2: 'GI',
    Iso3: 'GIB',
  },
  {
    name: 'Greece',
    Iso2: 'GR',
    Iso3: 'GRC',
  },
  {
    name: 'Greenland',
    Iso2: 'GL',
    Iso3: 'GRL',
  },
  {
    name: 'Grenada',
    Iso2: 'GD',
    Iso3: 'GRD',
  },
  {
    name: 'Guadeloupe',
    Iso2: 'GP',
    Iso3: 'GLP',
  },
  {
    name: 'Guam',
    Iso2: 'GU',
    Iso3: 'GUM',
  },
  {
    name: 'Guatemala',
    Iso2: 'GT',
    Iso3: 'GTM',
  },
  {
    name: 'Guernsey',
    Iso2: 'GG',
    Iso3: 'GGY',
  },
  {
    name: 'Guinea',
    Iso2: 'GN',
    Iso3: 'GIN',
  },
  {
    name: 'Guinea-Bissau',
    Iso2: 'GW',
    Iso3: 'GNB',
  },
  {
    name: 'Guyana',
    Iso2: 'GY',
    Iso3: 'GUY',
  },
  {
    name: 'Haiti',
    Iso2: 'HT',
    Iso3: 'HTI',
  },
  {
    name: 'Heard Island and McDonald Islands',
    Iso2: 'HM',
    Iso3: 'HMD',
  },
  {
    name: 'Vatican City State (Holy See)',
    Iso2: 'VA',
    Iso3: 'VAT',
  },
  {
    name: 'Honduras',
    Iso2: 'HN',
    Iso3: 'HND',
  },
  {
    name: 'Hong Kong',
    Iso2: 'HK',
    Iso3: 'HKG',
  },
  {
    name: 'Hungary',
    Iso2: 'HU',
    Iso3: 'HUN',
  },
  {
    name: 'Iceland',
    Iso2: 'IS',
    Iso3: 'ISL',
  },
  {
    name: 'India',
    Iso2: 'IN',
    Iso3: 'IND',
  },
  {
    name: 'Indonesia',
    Iso2: 'ID',
    Iso3: 'IDN',
  },
  // {
  //   name: 'Iran',
  //   Iso2: 'IR',
  //   Iso3: 'IRN'
  // },
  // {
  //   name: 'Iraq',
  //   Iso2: 'IQ',
  //   Iso3: 'IRQ'
  // },
  {
    name: 'Ireland',
    Iso2: 'IE',
    Iso3: 'IRL',
  },
  {
    name: 'Isle of Man',
    Iso2: 'IM',
    Iso3: 'IMN',
  },
  {
    name: 'Israel',
    Iso2: 'IL',
    Iso3: 'ISR',
  },
  {
    name: 'Italy',
    Iso2: 'IT',
    Iso3: 'ITA',
  },
  {
    name: 'Jamaica',
    Iso2: 'JM',
    Iso3: 'JAM',
  },
  {
    name: 'Japan',
    Iso2: 'JP',
    Iso3: 'JPN',
  },
  {
    name: 'Jersey',
    Iso2: 'JE',
    Iso3: 'JEY',
  },
  {
    name: 'Jordan',
    Iso2: 'JO',
    Iso3: 'JOR',
  },
  {
    name: 'Kazakhstan',
    Iso2: 'KZ',
    Iso3: 'KAZ',
  },
  {
    name: 'Kenya',
    Iso2: 'KE',
    Iso3: 'KEN',
  },
  {
    name: 'Kiribati',
    Iso2: 'KI',
    Iso3: 'KIR',
  },
  {
    name: 'Kuwait',
    Iso2: 'KW',
    Iso3: 'KWT',
  },
  {
    name: 'Kyrgyzstan',
    Iso2: 'KG',
    Iso3: 'KGZ',
  },
  {
    name: 'Laos',
    Iso2: 'LA',
    Iso3: 'LAO',
  },
  {
    name: 'Latvia',
    Iso2: 'LV',
    Iso3: 'LVA',
  },
  // {
  //   name: 'Lebanon',
  //   Iso2: 'LB',
  //   Iso3: 'LBN'
  // },
  {
    name: 'Lesotho',
    Iso2: 'LS',
    Iso3: 'LSO',
  },
  {
    name: 'Liberia',
    Iso2: 'LR',
    Iso3: 'LBR',
  },
  {
    name: 'Liechtenstein',
    Iso2: 'LI',
    Iso3: 'LIE',
  },
  {
    name: 'Lithuania',
    Iso2: 'LT',
    Iso3: 'LTU',
  },
  {
    name: 'Luxembourg',
    Iso2: 'LU',
    Iso3: 'LUX',
  },
  {
    name: 'Macau',
    Iso2: 'MO',
    Iso3: 'MAC',
  },
  {
    name: 'Madagascar',
    Iso2: 'MG',
    Iso3: 'MDG',
  },
  {
    name: 'Malawi',
    Iso2: 'MW',
    Iso3: 'MWI',
  },
  {
    name: 'Malaysia',
    Iso2: 'MY',
    Iso3: 'MYS',
  },
  {
    name: 'Maldives',
    Iso2: 'MV',
    Iso3: 'MDV',
  },
  {
    name: 'Mali',
    Iso2: 'ML',
    Iso3: 'MLI',
  },
  {
    name: 'Malta',
    Iso2: 'MT',
    Iso3: 'MLT',
  },
  {
    name: 'Marshall Islands',
    Iso2: 'MH',
    Iso3: 'MHL',
  },
  {
    name: 'Martinique',
    Iso2: 'MQ',
    Iso3: 'MTQ',
  },
  {
    name: 'Mauritania',
    Iso2: 'MR',
    Iso3: 'MRT',
  },
  {
    name: 'Mauritius',
    Iso2: 'MU',
    Iso3: 'MUS',
  },
  {
    name: 'Mayotte',
    Iso2: 'YT',
    Iso3: 'MYT',
  },
  {
    name: 'Mexico',
    Iso2: 'MX',
    Iso3: 'MEX',
  },
  {
    name: 'Monaco',
    Iso2: 'MC',
    Iso3: 'MCO',
  },
  {
    name: 'Mongolia',
    Iso2: 'MN',
    Iso3: 'MNG',
  },
  // {
  //   name: 'Montenegro',
  //   Iso2: 'ME',
  //   Iso3: 'MNE'
  // },
  {
    name: 'Montserrat',
    Iso2: 'MS',
    Iso3: 'MSR',
  },
  {
    name: 'Morocco',
    Iso2: 'MA',
    Iso3: 'MAR',
  },
  {
    name: 'Mozambique',
    Iso2: 'MZ',
    Iso3: 'MOZ',
  },
  {
    name: 'Myanmar',
    Iso2: 'MM',
    Iso3: 'MMR',
  },
  {
    name: 'Namibia',
    Iso2: 'NA',
    Iso3: 'NAM',
  },
  {
    name: 'Nauru',
    Iso2: 'NR',
    Iso3: 'NRU',
  },
  {
    name: 'Nepal',
    Iso2: 'NP',
    Iso3: 'NPL',
  },
  {
    name: 'Netherlands',
    Iso2: 'NL',
    Iso3: 'NLD',
  },
  {
    name: 'New Caledonia',
    Iso2: 'NC',
    Iso3: 'NCL',
  },
  {
    name: 'New Zealand',
    Iso2: 'NZ',
    Iso3: 'NZL',
  },
  {
    name: 'Nicaragua',
    Iso2: 'NI',
    Iso3: 'NIC',
  },
  {
    name: 'Niger',
    Iso2: 'NE',
    Iso3: 'NER',
  },
  // {
  //   name: 'Nigeria',
  //   Iso2: 'NG',
  //   Iso3: 'NGA'
  // },
  {
    name: 'Niue',
    Iso2: 'NU',
    Iso3: 'NIU',
  },
  {
    name: 'Norfolk Island',
    Iso2: 'NF',
    Iso3: 'NFK',
  },
  {
    name: 'Northern Mariana Islands',
    Iso2: 'MP',
    Iso3: 'MNP',
  },
  {
    name: 'Norway',
    Iso2: 'NO',
    Iso3: 'NOR',
  },
  {
    name: 'Oman',
    Iso2: 'OM',
    Iso3: 'OMN',
  },
  // {
  //   name: 'Pakistan',
  //   Iso2: 'PK',
  //   Iso3: 'PAK'
  // },
  {
    name: 'Palau',
    Iso2: 'PW',
    Iso3: 'PLW',
  },
  {
    name: 'Panama',
    Iso2: 'PA',
    Iso3: 'PAN',
  },
  {
    name: 'Papua New Guinea',
    Iso2: 'PG',
    Iso3: 'PNG',
  },
  {
    name: 'Paraguay',
    Iso2: 'PY',
    Iso3: 'PRY',
  },
  {
    name: 'Peru',
    Iso2: 'PE',
    Iso3: 'PER',
  },
  {
    name: 'Philippines',
    Iso2: 'PH',
    Iso3: 'PHL',
  },
  {
    name: 'Pitcairn',
    Iso2: 'PN',
    Iso3: 'PCN',
  },
  {
    name: 'Poland',
    Iso2: 'PL',
    Iso3: 'POL',
  },
  {
    name: 'Portugal',
    Iso2: 'PT',
    Iso3: 'PRT',
  },
  {
    name: 'Puerto Rico',
    Iso2: 'PR',
    Iso3: 'PRI',
  },
  {
    name: 'Qatar',
    Iso2: 'QA',
    Iso3: 'QAT',
  },
  {
    name: 'Réunion',
    Iso2: 'RE',
    Iso3: 'REU',
  },
  {
    name: 'Romania',
    Iso2: 'RO',
    Iso3: 'ROU',
  },
  {
    name: 'Rwanda',
    Iso2: 'RW',
    Iso3: 'RWA',
  },
  {
    name: 'Saint Kitts and Nevis',
    Iso2: 'KN',
    Iso3: 'KNA',
  },
  {
    name: 'Saint Lucia',
    Iso2: 'LC',
    Iso3: 'LCA',
  },
  {
    name: 'Saint Pierre and Miquelon',
    Iso2: 'PM',
    Iso3: 'SPM',
  },
  {
    name: 'Saint Vincent and the Grenadines',
    Iso2: 'VC',
    Iso3: 'VCT',
  },
  {
    name: 'Samoa',
    Iso2: 'WS',
    Iso3: 'WSM',
  },
  {
    name: 'San Marino',
    Iso2: 'SM',
    Iso3: 'SMR',
  },
  {
    name: 'Sao Tome and Principe',
    Iso2: 'ST',
    Iso3: 'STP',
  },
  {
    name: 'Saudi Arabia',
    Iso2: 'SA',
    Iso3: 'SAU',
  },
  {
    name: 'Senegal',
    Iso2: 'SN',
    Iso3: 'SEN',
  },
  // {
  //   name: 'Serbia',
  //   Iso2: 'RS',
  //   Iso3: 'SRB'
  // },
  {
    name: 'Seychelles',
    Iso2: 'SC',
    Iso3: 'SYC',
  },
  {
    name: 'Sierra Leone',
    Iso2: 'SL',
    Iso3: 'SLE',
  },
  {
    name: 'Singapore',
    Iso2: 'SG',
    Iso3: 'SGP',
  },
  {
    name: 'Slovakia',
    Iso2: 'SK',
    Iso3: 'SVK',
  },
  // {
  //   name: 'Slovenia',
  //   Iso2: 'SI',
  //   Iso3: 'SVN'
  // },
  {
    name: 'Solomon Islands',
    Iso2: 'SB',
    Iso3: 'SLB',
  },
  // {
  //   name: 'Somalia',
  //   Iso2: 'SO',
  //   Iso3: 'SOM'
  // },
  {
    name: 'South Africa',
    Iso2: 'ZA',
    Iso3: 'ZAF',
  },
  {
    name: 'South Georgia and the South Sandwich Islands',
    Iso2: 'GS',
    Iso3: 'SGS',
  },
  {
    name: 'Spain',
    Iso2: 'ES',
    Iso3: 'ESP',
  },
  {
    name: 'Sri Lanka',
    Iso2: 'LK',
    Iso3: 'LKA',
  },
  // {
  //   name: 'Sudan',
  //   Iso2: 'SD',
  //   Iso3: 'SDN'
  // },
  {
    name: 'Suriname',
    Iso2: 'SR',
    Iso3: 'SUR',
  },
  {
    name: 'Swaziland',
    Iso2: 'SZ',
    Iso3: 'SWZ',
  },
  {
    name: 'Sweden',
    Iso2: 'SE',
    Iso3: 'SWE',
  },
  {
    name: 'Switzerland',
    Iso2: 'CH',
    Iso3: 'CHE',
  },
  // {
  //   name: 'Syria',
  //   Iso2: 'SY',
  //   Iso3: 'SYR'
  // },
  {
    name: 'Taiwan',
    Iso2: 'TW',
    Iso3: 'TWN',
  },
  {
    name: 'Tajikistan',
    Iso2: 'TJ',
    Iso3: 'TJK',
  },
  {
    name: 'Thailand',
    Iso2: 'TH',
    Iso3: 'THA',
  },
  {
    name: 'Timor-Leste',
    Iso2: 'TL',
    Iso3: 'TLS',
  },
  {
    name: 'Togo',
    Iso2: 'TG',
    Iso3: 'TGO',
  },
  {
    name: 'Tokelau',
    Iso2: 'TK',
    Iso3: 'TKL',
  },
  {
    name: 'Tonga',
    Iso2: 'TO',
    Iso3: 'TON',
  },
  {
    name: 'Trinidad and Tobago',
    Iso2: 'TT',
    Iso3: 'TTO',
  },
  {
    name: 'Tunisia',
    Iso2: 'TN',
    Iso3: 'TUN',
  },
  // {
  //   name: 'Turkey',
  //   Iso2: 'TR',
  //   Iso3: 'TUR'
  // },
  {
    name: 'Turkmenistan',
    Iso2: 'TM',
    Iso3: 'TKM',
  },
  {
    name: 'Turks and Caicos Islands',
    Iso2: 'TC',
    Iso3: 'TCA',
  },
  {
    name: 'Tuvalu',
    Iso2: 'TV',
    Iso3: 'TUV',
  },
  {
    name: 'Uganda',
    Iso2: 'UG',
    Iso3: 'UGA',
  },
  // {
  //   name: 'Ukraine',
  //   Iso2: 'UA',
  //   Iso3: 'UKR'
  // },
  {
    name: 'United Arab Emirates',
    Iso2: 'AE',
    Iso3: 'ARE',
  },
  {
    name: 'United Kingdom',
    Iso2: 'GB',
    Iso3: 'GBR',
  },
  {
    name: 'United States',
    Iso2: 'US',
    Iso3: 'USA',
  },
  {
    name: 'United States Minor Outlying Islands',
    Iso2: 'UM',
    Iso3: 'UMI',
  },
  {
    name: 'Uruguay',
    Iso2: 'UY',
    Iso3: 'URY',
  },
  {
    name: 'Uzbekistan',
    Iso2: 'UZ',
    Iso3: 'UZB',
  },
  {
    name: 'Vanuatu',
    Iso2: 'VU',
    Iso3: 'VUT',
  },
  {
    name: 'Vietnam',
    Iso2: 'VN',
    Iso3: 'VNM',
  },
  {
    name: 'Wallis and Futuna',
    Iso2: 'WF',
    Iso3: 'WLF',
  },
  // {
  //   name: 'Yemen',
  //   Iso2: 'YE',
  //   Iso3: 'YEM'
  // },
  {
    name: 'Zambia',
    Iso2: 'ZM',
    Iso3: 'ZMB',
  },
  {
    name: 'Zimbabwe',
    Iso2: 'ZW',
    Iso3: 'ZWE',
  },
  // {
  //   name: 'Russia',
  //   Iso2: 'RU',
  //   ISO3: 'RUS'
  // },
  // {
  //   name: 'South Korea',
  //   Iso2: 'KR',
  //   ISO3: 'KOR'
  // },
  {
    name: 'Tanzania',
    Iso2: 'TZ',
    ISO3: 'TZA',
  },
  // {
  //   name: 'Venezuela',
  //   Iso2: 'VE',
  //   ISO3: 'VEN'
  // },
  // {
  //   name: 'Zimbabwe',
  //   Iso2: 'ZW',
  //   ISO3: 'ZWE'
  // }
];

export default countriesWithISOCodes;
