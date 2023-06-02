const countriesWithFlagAndDialcodes = [
  {
    name: 'Bangladesh',
    currency: 'BDT',
    unicode_flag: '🇧🇩',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg',
    dial_code: '+880'
  },
  {
    name: 'Belgium',
    currency: 'EUR',
    unicode_flag: '🇧🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Belgium.svg',
    dial_code: '+32'
  },
  {
    name: 'Burkina Faso',
    currency: 'XOF',
    unicode_flag: '🇧🇫',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Burkina_Faso.svg',
    dial_code: '+226'
  },
  {
    name: 'Bulgaria',
    currency: 'BGN',
    unicode_flag: '🇧🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Bulgaria.svg',
    dial_code: '+359'
  },
  {
    name: 'Barbados',
    currency: 'BBD',
    unicode_flag: '🇧🇧',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Flag_of_Barbados.svg',
    dial_code: '+1-246'
  },
  {
    name: 'Wallis and Futuna',
    currency: 'XPF',
    unicode_flag: '🇼🇫',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Flag_of_Wallis_and_Futuna.svg',
    dial_code: '+681'
  },
  {
    name: 'Bermuda',
    currency: 'BMD',
    unicode_flag: '🇧🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Flag_of_Bermuda.svg',
    dial_code: '+1-441'
  },
  {
    name: 'Brunei',
    currency: 'BND',
    unicode_flag: '🇧🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Brunei.svg',
    dial_code: '+673'
  },
  {
    name: 'Bahrain',
    currency: 'BHD',
    unicode_flag: '🇧🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Bahrain.svg',
    dial_code: '+973'
  },
  {
    name: 'Benin',
    currency: 'XOF',
    unicode_flag: '🇧🇯',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Benin.svg',
    dial_code: '+229'
  },
  {
    name: 'Bhutan',
    currency: 'BTN',
    unicode_flag: '🇧🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Flag_of_Bhutan.svg',
    dial_code: '+975'
  },
  {
    name: 'Jamaica',
    currency: 'JMD',
    unicode_flag: '🇯🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Jamaica.svg',
    dial_code: '+1-876'
  },
  {
    name: 'Botswana',
    currency: 'BWP',
    unicode_flag: '🇧🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_Botswana.svg',
    dial_code: '+267'
  },
  {
    name: 'Samoa',
    currency: 'WST',
    unicode_flag: '🇼🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Samoa.svg',
    dial_code: '+685'
  },
  {
    name: 'Brazil',
    currency: 'BRL',
    unicode_flag: '🇧🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg',
    dial_code: '+55'
  },
  {
    name: 'Bahamas',
    currency: 'BSD',
    unicode_flag: '🇧🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Flag_of_the_Bahamas.svg',
    dial_code: '+1-242'
  },
  {
    name: 'Jersey',
    currency: 'GBP',
    unicode_flag: '🇯🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Flag_of_Jersey.svg',
    dial_code: '+44-1534'
  },
  {
    name: 'Belize',
    currency: 'BZD',
    unicode_flag: '🇧🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Flag_of_Belize.svg',
    dial_code: '+501'
  },
  // {
  //   name: 'Russia',
  //   currency: 'RUB',
  //   unicode_flag: '🇷🇺',
  //   dial_code: '+7'
  // },
  {
    name: 'Rwanda',
    currency: 'RWF',
    unicode_flag: '🇷🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Rwanda.svg',
    dial_code: '+250'
  },
  // {
  //   name: 'Serbia',
  //   currency: 'RSD',
  //   unicode_flag: '🇷🇸',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg',
  //   dial_code: '+381'
  // },
  {
    name: 'Timor-Leste',
    currency: 'USD',
    unicode_flag: '🇹🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Flag_of_East_Timor.svg',
    dial_code: '+670'
  },
  {
    name: 'Réunion',
    currency: 'EUR',
    unicode_flag: '🇷🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    dial_code: '+262'
  },
  {
    name: 'Turkmenistan',
    currency: 'TMT',
    unicode_flag: '🇹🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Turkmenistan.svg',
    dial_code: '+993'
  },
  {
    name: 'Tajikistan',
    currency: 'TJS',
    unicode_flag: '🇹🇯',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Flag_of_Tajikistan.svg',
    dial_code: '+992'
  },
  {
    name: 'Romania',
    currency: 'RON',
    unicode_flag: '🇷🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Romania.svg',
    dial_code: '+40'
  },
  {
    name: 'Tokelau',
    currency: 'NZD',
    unicode_flag: '🇹🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Flag_of_Tokelau.svg',
    dial_code: '+690'
  },
  {
    name: 'Guinea-Bissau',
    currency: 'XOF',
    unicode_flag: '🇬🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_Guinea-Bissau.svg',
    dial_code: '+245'
  },
  {
    name: 'Guam',
    currency: 'USD',
    unicode_flag: '🇬🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Flag_of_Guam.svg',
    dial_code: '+1-671'
  },
  {
    name: 'Guatemala',
    currency: 'GTQ',
    unicode_flag: '🇬🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Flag_of_Guatemala.svg',
    dial_code: '+502'
  },
  {
    name: 'Greece',
    currency: 'EUR',
    unicode_flag: '🇬🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg',
    dial_code: '+30'
  },
  {
    name: 'Equatorial Guinea',
    currency: 'XAF',
    unicode_flag: '🇬🇶',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Equatorial_Guinea.svg',
    dial_code: '+240'
  },
  {
    name: 'Guadeloupe',
    currency: 'EUR',
    unicode_flag: '🇬🇵',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Flag_of_Guadeloupe_%28local%29_variant.svg',
    dial_code: '+590'
  },
  {
    name: 'Japan',
    currency: 'JPY',
    unicode_flag: '🇯🇵',
    flag: 'https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg',
    dial_code: '+81'
  },
  {
    name: 'Guyana',
    currency: 'GYD',
    unicode_flag: '🇬🇾',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_Guyana.svg',
    dial_code: '+592'
  },
  {
    name: 'Guernsey',
    currency: 'GBP',
    unicode_flag: '🇬🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_Guernsey.svg',
    dial_code: '+44-1481'
  },
  {
    name: 'Georgia',
    currency: 'GEL',
    unicode_flag: '🇬🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Georgia.svg',
    dial_code: '+995'
  },
  {
    name: 'Grenada',
    currency: 'XCD',
    unicode_flag: '🇬🇩',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Grenada.svg',
    dial_code: '+1-473'
  },
  {
    name: 'United Kingdom',
    currency: 'GBP',
    unicode_flag: '🇬🇧',
    flag: 'https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg',
    dial_code: '+44'
  },
  {
    name: 'Gabon',
    currency: 'XAF',
    unicode_flag: '🇬🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Flag_of_Gabon.svg',
    dial_code: '+241'
  },
  {
    name: 'El Salvador',
    currency: 'USD',
    unicode_flag: '🇸🇻',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Flag_of_El_Salvador.svg',
    dial_code: '+503'
  },
  {
    name: 'Guinea',
    currency: 'GNF',
    unicode_flag: '🇬🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Flag_of_Guinea.svg',
    dial_code: '+224'
  },
  {
    name: 'Gambia',
    currency: 'GMD',
    unicode_flag: '🇬🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_The_Gambia.svg',
    dial_code: '+220'
  },
  {
    name: 'Greenland',
    currency: 'DKK',
    unicode_flag: '🇬🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_Greenland.svg',
    dial_code: '+299'
  },
  {
    name: 'Gibraltar',
    currency: 'GIP',
    unicode_flag: '🇬🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Flag_of_Gibraltar.svg',
    dial_code: '+350'
  },
  {
    name: 'Ghana',
    currency: 'GHS',
    unicode_flag: '🇬🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg',
    dial_code: '+233'
  },
  {
    name: 'Oman',
    currency: 'OMR',
    unicode_flag: '🇴🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg',
    dial_code: '+968'
  },
  {
    name: 'Tunisia',
    currency: 'TND',
    unicode_flag: '🇹🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg',
    dial_code: '+216'
  },
  {
    name: 'Jordan',
    currency: 'JOD',
    unicode_flag: '🇯🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Flag_of_Jordan.svg',
    dial_code: '+962'
  },
  // {
  //   name: 'Croatia',
  //   currency: 'HRK',
  //   unicode_flag: '🇭🇷',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Croatia.svg',
  //   dial_code: '+385'
  // },
  {
    name: 'Haiti',
    currency: 'HTG',
    unicode_flag: '🇭🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Haiti.svg',
    dial_code: '+509'
  },
  {
    name: 'Hungary',
    currency: 'HUF',
    unicode_flag: '🇭🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Flag_of_Hungary.svg',
    dial_code: '+36'
  },
  {
    name: 'Hong Kong',
    currency: 'HKD',
    unicode_flag: '🇭🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Flag_of_Hong_Kong.svg',
    dial_code: '+852'
  },
  {
    name: 'Honduras',
    currency: 'HNL',
    unicode_flag: '🇭🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Naval_Ensign_of_Honduras.svg',
    dial_code: '+504'
  },
  // {
  //   name: 'Venezuela',
  //   currency: 'VEF',
  //   unicode_flag: '🇻🇪',
  //   dial_code: '+58'
  // },
  {
    name: 'Vatican City State',
    currency: 'EUR',
    unicode_flag: '🇻🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_the_Vatican_City.svg',
    dial_code: '+379'
  },
  {
    name: 'Palau',
    currency: 'USD',
    unicode_flag: '🇵🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Palau.svg',
    dial_code: '+680'
  },
  {
    name: 'Portugal',
    currency: 'EUR',
    unicode_flag: '🇵🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg',
    dial_code: '+351'
  },
  {
    name: 'Paraguay',
    currency: 'PYG',
    unicode_flag: '🇵🇾',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg',
    dial_code: '+595'
  },
  // {
  //   name: 'Iraq',
  //   currency: 'IQD',
  //   unicode_flag: '🇮🇶',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Iraq.svg',
  //   dial_code: '+964'
  // },
  {
    name: 'Panama',
    currency: 'PAB',
    unicode_flag: '🇵🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Flag_of_Panama.svg',
    dial_code: '+507'
  },
  {
    name: 'French Polynesia',
    currency: 'XPF',
    unicode_flag: '🇵🇫',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Flag_of_French_Polynesia.svg',
    dial_code: '+689'
  },
  {
    name: 'Papua New Guinea',
    currency: 'PGK',
    unicode_flag: '🇵🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Flag_of_Papua_New_Guinea.svg',
    dial_code: '+675'
  },
  {
    name: 'Peru',
    currency: 'PEN',
    unicode_flag: '🇵🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg',
    dial_code: '+51'
  },
  // {
  //   name: 'Pakistan',
  //   currency: 'PKR',
  //   unicode_flag: '🇵🇰',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Flag_of_Pakistan.svg',
  //   dial_code: '+92'
  // },
  {
    name: 'Philippines',
    currency: 'PHP',
    unicode_flag: '🇵🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_the_Philippines.svg',
    dial_code: '+63'
  },
  {
    name: 'Pitcairn',
    currency: 'NZD',
    unicode_flag: '🇵🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_the_Pitcairn_Islands.svg',
    dial_code: '+870'
  },
  {
    name: 'Poland',
    currency: 'PLN',
    unicode_flag: '🇵🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/en/1/12/Flag_of_Poland.svg',
    dial_code: '+48'
  },
  {
    name: 'Saint Pierre and Miquelon',
    currency: 'EUR',
    unicode_flag: '🇵🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Flag_of_Saint-Pierre_and_Miquelon.svg',
    dial_code: '+508'
  },
  {
    name: 'Zambia',
    currency: 'ZMK',
    unicode_flag: '🇿🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Zambia.svg',
    dial_code: '+260'
  },
  {
    name: 'Estonia',
    currency: 'EUR',
    unicode_flag: '🇪🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Flag_of_Estonia.svg',
    dial_code: '+372'
  },
  {
    name: 'Egypt',
    currency: 'EGP',
    unicode_flag: '🇪🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Egypt.svg',
    dial_code: '+20'
  },
  {
    name: 'Cocos (Keeling) Islands',
    currency: 'AUD',
    unicode_flag: '🇨🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Flag_of_the_Cocos_%28Keeling%29_Islands.svg',
    dial_code: '+166'
  },
  {
    name: 'South Africa',
    currency: 'ZAR',
    unicode_flag: '🇿🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg',
    dial_code: '+27'
  },
  {
    name: 'Ecuador',
    currency: 'USD',
    unicode_flag: '🇪🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg',
    dial_code: '+593'
  },
  {
    name: 'Italy',
    currency: 'EUR',
    unicode_flag: '🇮🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg',
    dial_code: '+39'
  },
  {
    name: 'Vietnam',
    currency: 'VND',
    unicode_flag: '🇻🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg',
    dial_code: '+84'
  },
  {
    name: 'Solomon Islands',
    currency: 'SBD',
    unicode_flag: '🇸🇧',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Flag_of_the_Solomon_Islands.svg',
    dial_code: '+677'
  },
  {
    name: 'Ethiopia',
    currency: 'ETB',
    unicode_flag: '🇪🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_Ethiopia.svg',
    dial_code: '+251'
  },
  // {
  //   name: 'Somalia',
  //   currency: 'SOS',
  //   unicode_flag: '🇸🇴',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_Somalia.svg',
  //   dial_code: '+252'
  // },
  // {
  //   name: 'Zimbabwe',
  //   currency: 'ZWL',
  //   unicode_flag: '🇿🇼',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Flag_of_Zimbabwe.svg',
  //   dial_code: '+263'
  // },
  {
    name: 'Saudi Arabia',
    currency: 'SAR',
    unicode_flag: '🇸🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg',
    dial_code: '+966'
  },
  {
    name: 'Spain',
    currency: 'EUR',
    unicode_flag: '🇪🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg',
    dial_code: '+34'
  },
  {
    name: 'Eritrea',
    currency: 'ERN',
    unicode_flag: '🇪🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Flag_of_Eritrea.svg',
    dial_code: '+291'
  },
  // {
  //   name: 'Montenegro',
  //   currency: 'EUR',
  //   unicode_flag: '🇲🇪',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Montenegro.svg',
  //   dial_code: '+382'
  // },
  {
    name: 'Moldova',
    currency: 'MDL',
    unicode_flag: '🇲🇩',
    dial_code: '+373'
  },
  {
    name: 'Madagascar',
    currency: 'MGA',
    unicode_flag: '🇲🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Madagascar.svg',
    dial_code: '+261'
  },
  {
    name: 'Morocco',
    currency: 'MAD',
    unicode_flag: '🇲🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg',
    dial_code: '+212'
  },
  {
    name: 'Monaco',
    currency: 'EUR',
    unicode_flag: '🇲🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Flag_of_Monaco.svg',
    dial_code: '+377'
  },
  {
    name: 'Uzbekistan',
    currency: 'UZS',
    unicode_flag: '🇺🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg',
    dial_code: '+998'
  },
  {
    name: 'Myanmar',
    currency: 'MMK',
    unicode_flag: '🇲🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_Myanmar.svg',
    dial_code: '+95'
  },
  {
    name: 'Mali',
    currency: 'XOF',
    unicode_flag: '🇲🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Mali.svg',
    dial_code: '+223'
  },
  {
    name: 'Macau',
    currency: 'MOP',
    unicode_flag: '🇲🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Flag_of_Macau.svg',
    dial_code: '+853'
  },
  {
    name: 'Mongolia',
    currency: 'MNT',
    unicode_flag: '🇲🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Mongolia.svg',
    dial_code: '+976'
  },
  {
    name: 'Marshall Islands',
    currency: 'USD',
    unicode_flag: '🇲🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flag_of_the_Marshall_Islands.svg',
    dial_code: '+692'
  },
  {
    name: 'Mauritius',
    currency: 'MUR',
    unicode_flag: '🇲🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Mauritius.svg',
    dial_code: '+230'
  },
  {
    name: 'Malta',
    currency: 'EUR',
    unicode_flag: '🇲🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Malta.svg',
    dial_code: '+356'
  },
  {
    name: 'Malawi',
    currency: 'MWK',
    unicode_flag: '🇲🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Flag_of_Malawi.svg',
    dial_code: '+265'
  },
  {
    name: 'Maldives',
    currency: 'MVR',
    unicode_flag: '🇲🇻',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Maldives.svg',
    dial_code: '+960'
  },
  {
    name: 'Martinique',
    currency: 'EUR',
    unicode_flag: '🇲🇶',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Snake_Flag_of_Martinique.svg',
    dial_code: '+596'
  },
  {
    name: 'Northern Mariana Islands',
    currency: 'USD',
    unicode_flag: '🇲🇵',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Flag_of_the_Northern_Mariana_Islands.svg',
    dial_code: '+1-670'
  },
  {
    name: 'Montserrat',
    currency: 'XCD',
    unicode_flag: '🇲🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Flag_of_Montserrat.svg',
    dial_code: '+1-664'
  },
  {
    name: 'Mauritania',
    currency: 'MRO',
    unicode_flag: '🇲🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Flag_of_Mauritania.svg',
    dial_code: '+222'
  },
  {
    name: 'Isle of Man',
    currency: 'GBP',
    unicode_flag: '🇮🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_the_Isle_of_Man.svg',
    dial_code: '+44-1624'
  },
  {
    name: 'Uganda',
    currency: 'UGX',
    unicode_flag: '🇺🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Flag_of_Uganda.svg',
    dial_code: '+256'
  },
  {
    name: 'Tanzania',
    currency: 'TZS',
    unicode_flag: '🇹🇿',
    dial_code: '+255'
  },
  {
    name: 'Malaysia',
    currency: 'MYR',
    unicode_flag: '🇲🇾',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Flag_of_Malaysia.svg',
    dial_code: '+60'
  },
  {
    name: 'Mexico',
    currency: 'MXN',
    unicode_flag: '🇲🇽',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg',
    dial_code: '+52'
  },
  {
    name: 'Israel',
    currency: 'ILS',
    unicode_flag: '🇮🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Israel.svg',
    dial_code: '+972'
  },
  {
    name: 'France',
    currency: 'EUR',
    unicode_flag: '🇫🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    dial_code: '+33'
  },
  {
    name: 'Finland',
    currency: 'EUR',
    unicode_flag: '🇫🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Finland.svg',
    dial_code: '+358'
  },
  {
    name: 'Fiji',
    currency: 'FJD',
    unicode_flag: '🇫🇯',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Fiji.svg',
    dial_code: '+679'
  },
  {
    name: 'Falkland Islands',
    currency: 'FKP',
    unicode_flag: '🇫🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_the_Falkland_Islands.svg',
    dial_code: '+500'
  },
  {
    name: 'Faroe Islands',
    currency: 'DKK',
    unicode_flag: '🇫🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Flag_of_the_Faroe_Islands.svg',
    dial_code: '+298'
  },
  {
    name: 'Nicaragua',
    currency: 'NIO',
    unicode_flag: '🇳🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Nicaragua.svg',
    dial_code: '+505'
  },
  {
    name: 'Netherlands',
    currency: 'EUR',
    unicode_flag: '🇳🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg',
    dial_code: '+31'
  },
  {
    name: 'Norway',
    currency: 'NOK',
    unicode_flag: '🇳🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg',
    dial_code: '+47'
  },
  {
    name: 'Namibia',
    currency: 'NAD',
    unicode_flag: '🇳🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Namibia.svg',
    dial_code: '+264'
  },
  {
    name: 'Vanuatu',
    currency: 'VUV',
    unicode_flag: '🇻🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Vanuatu.svg',
    dial_code: '+678'
  },
  {
    name: 'New Caledonia',
    currency: 'XPF',
    unicode_flag: '🇳🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Flags_of_New_Caledonia.svg',
    dial_code: '+687'
  },
  {
    name: 'Niger',
    currency: 'XOF',
    unicode_flag: '🇳🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Flag_of_Niger.svg',
    dial_code: '+227'
  },
  {
    name: 'Norfolk Island',
    currency: 'AUD',
    unicode_flag: '🇳🇫',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Norfolk_Island.svg',
    dial_code: '+672'
  },
  // {
  //   name: 'Nigeria',
  //   currency: 'NGN',
  //   unicode_flag: '🇳🇬',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg',
  //   dial_code: '+234'
  // },
  {
    name: 'New Zealand',
    currency: 'NZD',
    unicode_flag: '🇳🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg',
    dial_code: '+64'
  },
  {
    name: 'Nepal',
    currency: 'NPR',
    unicode_flag: '🇳🇵',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Flag_of_Nepal.svg',
    dial_code: '+977'
  },
  {
    name: 'Nauru',
    currency: 'AUD',
    unicode_flag: '🇳🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Flag_of_Nauru.svg',
    dial_code: '+674'
  },
  {
    name: 'Niue',
    currency: 'NZD',
    unicode_flag: '🇳🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_Niue.svg',
    dial_code: '+683'
  },
  {
    name: 'Cook Islands',
    currency: 'NZD',
    unicode_flag: '🇨🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_the_Cook_Islands.svg',
    dial_code: '+682'
  },
  {
    name: 'Switzerland',
    currency: 'CHF',
    unicode_flag: '🇨🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Flag_of_Switzerland_%28Pantone%29.svg',
    dial_code: '+41'
  },
  {
    name: 'Colombia',
    currency: 'COP',
    unicode_flag: '🇨🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg',
    dial_code: '+57'
  },
  {
    name: 'China',
    currency: 'CNY',
    unicode_flag: '🇨🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg',
    dial_code: '+86'
  },
  {
    name: 'Cameroon',
    currency: 'XAF',
    unicode_flag: '🇨🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Flag_of_Cameroon.svg',
    dial_code: '+237'
  },
  {
    name: 'Chile',
    currency: 'CLP',
    unicode_flag: '🇨🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg',
    dial_code: '+56'
  },
  {
    name: 'Canada',
    currency: 'CAD',
    unicode_flag: '🇨🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/en/c/cf/Flag_of_Canada.svg',
    dial_code: '+1'
  },
  // {
  //   name: 'Congo',
  //   currency: 'XAF',
  //   unicode_flag: '🇨🇬',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_the_Republic_of_the_Congo.svg',
  //   dial_code: '+242'
  // },
  // {
  //   name: 'Republic of the Congo',
  //   currency: 'CDF',
  //   unicode_flag: '🇨🇩',
  //   dial_code: '+243'
  // },
  {
    name: 'Czech Republic',
    currency: 'CZK',
    unicode_flag: '🇨🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_Czech_Republic.svg',
    dial_code: '+420'
  },
  // {
  //   name: 'Cyprus',
  //   currency: 'EUR',
  //   unicode_flag: '🇨🇾',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Cyprus.svg',
  //   dial_code: '+357'
  // },
  {
    name: 'Christmas Island',
    currency: 'AUD',
    unicode_flag: '🇨🇽',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Flag_of_Christmas_Island.svg',
    dial_code: '+61'
  },
  {
    name: 'Costa Rica',
    currency: 'CRC',
    unicode_flag: '🇨🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Costa_Rica_%28state%29.svg',
    dial_code: '+506'
  },
  {
    name: 'Cape Verde',
    currency: 'CVE',
    unicode_flag: '🇨🇻',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Cape_Verde.svg',
    dial_code: '+238'
  },
  // {
  //   name: 'Cuba',
  //   currency: 'CUP',
  //   unicode_flag: '🇨🇺',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Flag_of_Cuba.svg',
  //   dial_code: '+53'
  // },
  {
    name: 'Swaziland',
    currency: 'SZL',
    unicode_flag: '🇸🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Flag_of_Eswatini.svg',
    dial_code: '+268'
  },
  // {
  //   name: 'Syria',
  //   currency: 'SYP',
  //   unicode_flag: '🇸🇾',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Flag_of_Syria.svg',
  //   dial_code: '+963'
  // },
  {
    name: 'Kyrgyzstan',
    currency: 'KGS',
    unicode_flag: '🇰🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Flag_of_Kyrgyzstan.svg',
    dial_code: '+996'
  },
  {
    name: 'Kenya',
    currency: 'KES',
    unicode_flag: '🇰🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg',
    dial_code: '+254'
  },
  {
    name: 'Suriname',
    currency: 'SRD',
    unicode_flag: '🇸🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Flag_of_Suriname.svg',
    dial_code: '+597'
  },
  {
    name: 'Kiribati',
    currency: 'AUD',
    unicode_flag: '🇰🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Kiribati.svg',
    dial_code: '+686'
  },
  {
    name: 'Cambodia',
    currency: 'KHR',
    unicode_flag: '🇰🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Flag_of_Cambodia.svg',
    dial_code: '+855'
  },
  {
    name: 'Saint Kitts and Nevis',
    currency: 'XCD',
    unicode_flag: '🇰🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Saint_Kitts_and_Nevis.svg',
    dial_code: '+1-869'
  },
  {
    name: 'Comoros',
    currency: 'KMF',
    unicode_flag: '🇰🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Flag_of_the_Comoros.svg',
    dial_code: '+269'
  },
  {
    name: 'Sao Tome and Principe',
    currency: 'STD',
    unicode_flag: '🇸🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Flag_of_Sao_Tome_and_Principe.svg',
    dial_code: '+239'
  },
  {
    name: 'Slovakia',
    currency: 'EUR',
    unicode_flag: '🇸🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Flag_of_Slovakia.svg',
    dial_code: '+421'
  },
  // {
  //   name: 'South Korea',
  //   currency: 'KRW',
  //   unicode_flag: '🇰🇷',
  //   dial_code: '+82'
  // },
  // {
  //   name: 'Slovenia',
  //   currency: 'EUR',
  //   unicode_flag: '🇸🇮',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Flag_of_Slovenia.svg',
  //   dial_code: '+386'
  // },
  {
    name: 'Kuwait',
    currency: 'KWD',
    unicode_flag: '🇰🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Flag_of_Kuwait.svg',
    dial_code: '+965'
  },
  {
    name: 'Senegal',
    currency: 'XOF',
    unicode_flag: '🇸🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg',
    dial_code: '+221'
  },
  {
    name: 'San Marino',
    currency: 'EUR',
    unicode_flag: '🇸🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Flag_of_San_Marino.svg',
    dial_code: '+378'
  },
  {
    name: 'Sierra Leone',
    currency: 'SLL',
    unicode_flag: '🇸🇱',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Sierra_Leone.svg',
    dial_code: '+232'
  },
  {
    name: 'Seychelles',
    currency: 'SCR',
    unicode_flag: '🇸🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Seychelles.svg',
    dial_code: '+248'
  },
  {
    name: 'Kazakhstan',
    currency: 'KZT',
    unicode_flag: '🇰🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Kazakhstan.svg',
    dial_code: '+7'
  },
  {
    name: 'Cayman Islands',
    currency: 'KYD',
    unicode_flag: '🇰🇾',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_the_Cayman_Islands.svg',
    dial_code: '+1-345'
  },
  {
    name: 'Singapore',
    currency: 'SGD',
    unicode_flag: '🇸🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Singapore.svg',
    dial_code: '+65'
  },
  {
    name: 'Sweden',
    currency: 'SEK',
    unicode_flag: '🇸🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg',
    dial_code: '+46'
  },
  // {
  //   name: 'Sudan',
  //   currency: 'SDG',
  //   unicode_flag: '🇸🇩',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_Sudan.svg',
  //   dial_code: '+249'
  // },
  {
    name: 'Dominica',
    currency: 'XCD',
    unicode_flag: '🇩🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Flag_of_Dominica.svg',
    dial_code: '+1-767'
  },
  {
    name: 'Djibouti',
    currency: 'DJF',
    unicode_flag: '🇩🇯',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Flag_of_Djibouti.svg',
    dial_code: '+253'
  },
  {
    name: 'Denmark',
    currency: 'DKK',
    unicode_flag: '🇩🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg',
    dial_code: '+45'
  },
  {
    name: 'Germany',
    currency: 'EUR',
    unicode_flag: '🇩🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg',
    dial_code: '+49'
  },
  // {
  //   name: 'Yemen',
  //   currency: 'YER',
  //   unicode_flag: '🇾🇪',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Yemen.svg',
  //   dial_code: '+967'
  // },
  {
    name: 'Algeria',
    currency: 'DZD',
    unicode_flag: '🇩🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg',
    dial_code: '+213'
  },
  {
    name: 'United States',
    currency: 'USD',
    unicode_flag: '🇺🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    dial_code: '+1'
  },
  {
    name: 'Uruguay',
    currency: 'UYU',
    unicode_flag: '🇺🇾',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Uruguay.svg',
    dial_code: '+598'
  },
  {
    name: 'Mayotte',
    currency: 'EUR',
    unicode_flag: '🇾🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    dial_code: '+262'
  },
  // {
  //   name: 'Lebanon',
  //   currency: 'LBP',
  //   unicode_flag: '🇱🇧',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Flag_of_Lebanon.svg',
  //   dial_code: '+961'
  // },
  {
    name: 'Saint Lucia',
    currency: 'XCD',
    unicode_flag: '🇱🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Saint_Lucia.svg',
    dial_code: '+1-758'
  },
  {
    name: 'Laos',
    currency: 'LAK',
    unicode_flag: '🇱🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Laos.svg',
    dial_code: '+856'
  },
  {
    name: 'Tuvalu',
    currency: 'AUD',
    unicode_flag: '🇹🇻',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tuvalu.svg',
    dial_code: '+688'
  },
  {
    name: 'Taiwan',
    currency: 'TWD',
    unicode_flag: '🇹🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Flag_of_the_Republic_of_China.svg',
    dial_code: '+886'
  },
  {
    name: 'Trinidad and Tobago',
    currency: 'TTD',
    unicode_flag: '🇹🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Flag_of_Trinidad_and_Tobago.svg',
    dial_code: '+1-868'
  },
  // {
  //   name: 'Turkey',
  //   currency: 'TRY',
  //   unicode_flag: '🇹🇷',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg',
  //   dial_code: '+90'
  // },
  {
    name: 'Sri Lanka',
    currency: 'LKR',
    unicode_flag: '🇱🇰',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg',
    dial_code: '+94'
  },
  {
    name: 'Liechtenstein',
    currency: 'CHF',
    unicode_flag: '🇱🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Flag_of_Liechtenstein.svg',
    dial_code: '+423'
  },
  {
    name: 'Latvia',
    currency: 'EUR',
    unicode_flag: '🇱🇻',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Latvia.svg',
    dial_code: '+371'
  },
  {
    name: 'Tonga',
    currency: 'TOP',
    unicode_flag: '🇹🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Tonga.svg',
    dial_code: '+676'
  },
  {
    name: 'Lithuania',
    currency: 'LTL',
    unicode_flag: '🇱🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Lithuania.svg',
    dial_code: '+370'
  },
  {
    name: 'Luxembourg',
    currency: 'EUR',
    unicode_flag: '🇱🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Flag_of_Luxembourg.svg',
    dial_code: '+352'
  },
  {
    name: 'Liberia',
    currency: 'LRD',
    unicode_flag: '🇱🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Flag_of_Liberia.svg',
    dial_code: '+231'
  },
  {
    name: 'Lesotho',
    currency: 'LSL',
    unicode_flag: '🇱🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Flag_of_Lesotho.svg',
    dial_code: '+266'
  },
  {
    name: 'Thailand',
    currency: 'THB',
    unicode_flag: '🇹🇭',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg',
    dial_code: '+66'
  },
  {
    name: 'Togo',
    currency: 'XOF',
    unicode_flag: '🇹🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Flag_of_Togo.svg',
    dial_code: '+228'
  },
  {
    name: 'Chad',
    currency: 'XAF',
    unicode_flag: '🇹🇩',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Flag_of_Chad.svg',
    dial_code: '+235'
  },
  {
    name: 'Turks and Caicos Islands',
    currency: 'USD',
    unicode_flag: '🇹🇨',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_the_Turks_and_Caicos_Islands.svg',
    dial_code: '+1-649'
  },
  {
    name: 'United Arab Emirates',
    currency: 'AED',
    unicode_flag: '🇦🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg',
    dial_code: '+971'
  },
  {
    name: 'Andorra',
    currency: 'EUR',
    unicode_flag: '🇦🇩',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Andorra.svg',
    dial_code: '+376'
  },
  {
    name: 'Antigua and Barbuda',
    currency: 'XCD',
    unicode_flag: '🇦🇬',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Antigua_and_Barbuda.svg',
    dial_code: '+1-268'
  },
  {
    name: 'Afghanistan',
    currency: 'AFN',
    unicode_flag: '🇦🇫',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Afghanistan.svg',
    dial_code: '+93'
  },
  {
    name: 'Anguilla',
    currency: 'XCD',
    unicode_flag: '🇦🇮',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Anguilla.svg',
    dial_code: '+1-264'
  },
  {
    name: 'Iceland',
    currency: 'ISK',
    unicode_flag: '🇮🇸',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Iceland.svg',
    dial_code: '+354'
  },
  // {
  //   name: 'Iran',
  //   currency: 'IRR',
  //   unicode_flag: '🇮🇷',
  //   flag: ' https://upload.wikimedia.org/wikipedia/commons/c/ca/Flag_of_Iran.svg',
  //   dial_code: '+98'
  // },
  {
    name: 'Armenia',
    currency: 'AMD',
    unicode_flag: '🇦🇲',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Flag_of_Armenia.svg',
    dial_code: '+374'
  },
  {
    name: 'Angola',
    currency: 'AOA',
    unicode_flag: '🇦🇴',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg',
    dial_code: '+244'
  },
  {
    name: 'Argentina',
    currency: 'ARS',
    unicode_flag: '🇦🇷',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    dial_code: '+54'
  },
  {
    name: 'Australia',
    currency: 'AUD',
    unicode_flag: '🇦🇺',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_Australia_%28converted%29.svg',
    dial_code: '+61'
  },
  {
    name: 'Austria',
    currency: 'EUR',
    unicode_flag: '🇦🇹',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg',
    dial_code: '+43'
  },
  {
    name: 'Aruba',
    currency: 'AWG',
    unicode_flag: '🇦🇼',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Aruba.svg',
    dial_code: '+297'
  },
  {
    name: 'India',
    currency: 'INR',
    unicode_flag: '🇮🇳',
    flag: 'https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg',
    dial_code: '+91'
  },
  {
    name: 'Azerbaijan',
    currency: 'AZN',
    unicode_flag: '🇦🇿',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg',
    dial_code: '+994'
  },
  {
    name: 'Ireland',
    currency: 'EUR',
    unicode_flag: '🇮🇪',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg',
    dial_code: '+353'
  },
  {
    name: 'Indonesia',
    currency: 'IDR',
    unicode_flag: '🇮🇩',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Indonesia.svg',
    dial_code: '+62'
  },
  // {
  //   name: 'Ukraine',
  //   currency: 'UAH',
  //   unicode_flag: '🇺🇦',
  //   flag: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg',
  //   dial_code: '+380'
  // },
  {
    name: 'Qatar',
    currency: 'QAR',
    unicode_flag: '🇶🇦',
    flag: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg',
    dial_code: '+974'
  }
];

export default countriesWithFlagAndDialcodes;
