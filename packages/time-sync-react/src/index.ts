// Currently erring on the side of NOT exposing the base TimeSync implementation
// (or any related types for setting it up) from this package. If you have a
// React project, you probably don't ever need the raw TimeSync aside from some
// incidental escape hatches. But useTimeSyncRef takes care of all of that
export {
	type InvalidateStateOptions,
	type NotificationBehavior,
	ReadonlyDate,
	refreshRates,
	type Snapshot,
	type SubscriptionHandshake,
} from "../../time-sync/src";
export {
	TimeSyncProvider,
	type TimeSyncProviderProps,
	type TimeSyncWithoutDispose,
	useTimeSync,
	useTimeSyncRef,
} from "./useTimeSync";
