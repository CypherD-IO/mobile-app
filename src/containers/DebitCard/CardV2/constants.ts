import { isIOS } from "../../../misc/checkers";

export const H_CARD_SECTION = 270;
export const OFFSET_CARD_SECTION = isIOS() ? -H_CARD_SECTION : 0;
export const H_CARD_GUTTER = 60;