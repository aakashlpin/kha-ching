import { STRATEGIES } from "../lib/constants";
import { KiteOrder, KiteProfile } from "./kite";
import { AvailablePlansConfig } from "./plans";

export type DailyPlansDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type DailyPlansDisplayValue = {
    heading: string;
    selectedStrategy: STRATEGIES | '';
    strategies: Record<string, AvailablePlansConfig>
}

export type DailyPlansConfig = Record<DailyPlansDayKey, DailyPlansDisplayValue>

export interface SignalXOrder extends KiteOrder {
    humanTradingSymbol: string;
}

export interface SignalXUser {
    session: KiteProfile;
    isLoggedIn: boolean;
}