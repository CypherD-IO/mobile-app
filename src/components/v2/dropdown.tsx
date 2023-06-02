import React from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import { Colors } from '../../constants/theme';

export default function CyDDropDown (props: any) {
  return (
    <>
      <Dropdown selectedTextStyle={{ color: Colors.secondaryTextColor }} {...props} />
    </>
  );
}
