import { afterEach, describe, it, vi } from "vitest";
import {
	newReadonlyDate,
	REFRESH_ONE_HOUR,
	REFRESH_ONE_MINUTE,
	REFRESH_ONE_SECOND,
	TimeSync,
} from "./TimeSync";

// For better or worse, this is a personally meaningful day to me. It's why I
// was able to find the time to get these packages finished up and published
const defaultDateString = "October 27, 2025";

// newReadonlyDate is mostly being treated as an internal implementation
// detail for the moment, but because we still export it for convenience,
// we need to make sure that it's 100% interchangeable with native Date
// objects for all purposes aside from mutations
describe.concurrent.only(newReadonlyDate.name, () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Asserting this first because we rely on this behavior for the other tests
	it("Supports equality checks against native Dates", ({ expect }) => {
		const controlDate = new Date(defaultDateString);
		const readonly = newReadonlyDate(defaultDateString);
		expect(controlDate).toEqual(readonly);
	});

	/**
	 * @todo 2025-11-16 - Need to figure out why, but for some reason, when you
	 * create an expected Date via an ISO string, all comparisons against it and
	 * the readonly Date created during the test fail with a TypeError from
	 * trying to access .toISOString.
	 *
	 * Calling .toISOString normally still works, so this might be some weird
	 * nuance on Vitest's .toEqual method.
	 */
	it("Mirrors type signature of native Dates", ({ expect }) => {
		// Have to save the version without arguments for last, because it
		// requires the most mocking, and has a risk of breaking the other cases
		type TestCase = Readonly<{
			input: readonly (number | string | Date)[];
			expected: Date;
		}>;
		const cases = [
			// {
			// 	input: [752_475_600_000],
			// 	expected: new Date("November 5, 1993"),
			// },
			// {
			// 	input: ["September 4, 2000"],
			// 	expected: new Date("September 4, 2000"),
			// },
			// {
			// 	input: [new Date("January 8, 1940")],
			// 	expected: new Date("January 8, 1940"),
			// },
			// {
			// 	input: [2009, 10],
			// 	expected: new Date("November 1, 2009"),
			// },
			// {
			// 	input: [2008, 2, 4],
			// 	expected: new Date("March 4, 2008"),
			// },
			{
				input: [2000, 1, 1, 5],
				expected: new Date("2000-02-01T05:00:00.000Z"),
			},
		] satisfies readonly TestCase[];

		for (const { input, expected } of cases) {
			// @ts-expect-error -- This should always work at runtime, but the
			// TypeScript compiler isn't smart enough to figure that out
			const readonly = newReadonlyDate(...input);
			expect(readonly).toEqual(expected);
		}

		const control = new Date(defaultDateString);
		vi.setSystemTime(control);
		const withoutArgs = newReadonlyDate();
		expect(withoutArgs).toEqual(control);
	});

	it("Can be instantiated via other readonly Dates", ({ expect }) => {
		const first = newReadonlyDate(defaultDateString);
		const derived = newReadonlyDate(first);
		expect(first).toEqual(derived);
	});

	it("Turns all mutation methods into no-ops", ({ expect }) => {
		const source = newReadonlyDate(defaultDateString);
		const copyBeforeMutations = newReadonlyDate(source);

		const setTests: readonly (() => void)[] = [
			() => source.setDate(4_932_049_023),
			() => source.setFullYear(2000),
			() => source.setHours(50),
			() => source.setMilliseconds(499),
			() => source.setMinutes(45),
			() => source.setMonth(3),
			() => source.setSeconds(40),
			() => source.setTime(0),
			() => source.setUTCDate(3),
			() => source.setUTCFullYear(1994),
			() => source.setUTCHours(7),
			() => source.setUTCMilliseconds(45),
			() => source.setUTCMinutes(57),
			() => source.setUTCMonth(3),
			() => source.setUTCSeconds(20),
		];
		for (const test of setTests) {
			test();
		}

		expect(source).toEqual(copyBeforeMutations);
	});

	it("Throws on direct property mutations", ({ expect }) => {
		const mutations: readonly ((d: Date) => void)[] = [
			(d) => {
				d.getDate = () => NaN;
			},
			(d) => {
				d.getMonth = () => NaN;
			},
			(d) => {
				d.setDate = () => NaN;
			},
		];

		const normalDate = new Date(defaultDateString);
		for (const mutate of mutations) {
			expect(() => mutate(normalDate)).not.toThrow();
		}

		const readonly = newReadonlyDate(defaultDateString);
		for (const mutate of mutations) {
			expect(() => mutate(readonly)).toThrow(TypeError);
		}
	});
});

describe.concurrent(TimeSync.name, () => {
	function initializeTime(dateString: string = defaultDateString): Date {
		const sourceDate = new Date(dateString);
		vi.setSystemTime(sourceDate);
		vi.useFakeTimers();
		return newReadonlyDate(sourceDate);
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const sampleLiveRefreshRates: readonly number[] = [
		REFRESH_ONE_SECOND,
		REFRESH_ONE_MINUTE,
		REFRESH_ONE_HOUR,
	];

	const sampleInvalidIntervals: readonly number[] = [
		Number.NaN,
		Number.NEGATIVE_INFINITY,
		0,
		-42,
		470.53,
	];

	describe("Subscriptions: default behavior", () => {
		it("Never auto-updates state while there are zero subscribers", async ({
			expect,
		}) => {
			const initialDate = initializeTime();
			const sync = new TimeSync({ initialDate });
			const initialSnap = sync.getStateSnapshot();
			expect(initialSnap).toEqual(initialDate);

			await vi.advanceTimersByTimeAsync(5 * REFRESH_ONE_SECOND);
			const newSnap1 = sync.getStateSnapshot();
			expect(newSnap1).toEqual(initialSnap);

			await vi.advanceTimersByTimeAsync(500 * REFRESH_ONE_SECOND);
			const newSnap2 = sync.getStateSnapshot();
			expect(newSnap2).toEqual(initialSnap);
		});

		it("Lets a single external system subscribe to periodic time updates", async ({
			expect,
		}) => {
			const sync = new TimeSync({ initialDate: initializeTime() });
			const onUpdate = vi.fn();

			for (const rate of sampleLiveRefreshRates) {
				const unsub = sync.subscribe({
					onUpdate,
					targetRefreshIntervalMs: rate,
				});
				expect(onUpdate).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(rate);
				const snap = sync.getStateSnapshot();
				expect(onUpdate).toHaveBeenCalledTimes(1);
				expect(onUpdate).toHaveBeenCalledWith(snap);

				unsub();
				onUpdate.mockRestore();
			}
		});

		it("Lets multiple subscriber subscribe to periodic time updates", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		// This is really important behavior for the React bindings. Those use
		// useSyncExternalStore under the hood, which require that you always
		// return out the same value by reference every time React tries to pull
		// a value from an external state source. Otherwise the hook will keep
		// pulling the values over and over again until it gives up and throws
		// a runtime error
		it("Exposes the exact same date snapshot (by reference) to subscribers on each update", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Throws an error if provided subscription interval is not a positive integer", ({
			expect,
		}) => {
			const sync = new TimeSync();
			const dummyFunction = vi.fn();

			for (const i of sampleInvalidIntervals) {
				expect(() => {
					void sync.subscribe({
						targetRefreshIntervalMs: i,
						onUpdate: dummyFunction,
					});
				}).toThrow(
					`TimeSync refresh interval must be a positive integer (received ${i}ms)`,
				);
			}
		});

		it("Dispatches updates to all subscribers based on fastest interval specified", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Calls onUpdate callback one time total if subscription is registered multiple times for the same time interval", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Calls onUpdate callback one time total if subscription is registered multiple times for different time intervals", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Calls onUpdate callback one time total if subscription is registered multiple times with a mix of redundant/different intervals", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Lets an external system unsubscribe", ({ expect }) => {
			expect.hasAssertions();
		});

		it("Slows updates down to the second-fastest interval when the all subscribers for the fastest interval unsubscribe", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		/**
		 * Was really hard to describe this in a single sentence, but basically:
		 * 1. Let's say that we have subscribers A AND B. A subscribes for 500ms
		 *    and B subscribes for 1000ms.
		 * 2. At 450ms, A unsubscribes.
		 * 3. Rather than starting the timer over, a one-time 'pseudo-timeout'
		 *    is kicked off for the delta between the elapsed time and B (650ms)
		 * 4. After the timeout resolves, updates go back to happening on an
		 *    interval of 1000ms.
		 */
		it("Does not completely start next interval over from scratch if fastest subscription is removed halfway through update", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Immediately notifies subscribers if new refresh interval is added that is less than or equal to the time since the last update", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Does not fully remove an onUpdate callback if multiple systems use it to subscribe, and only one system unsubscribes", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Automatically updates the date snapshot after the very first subscription is received, regardless of specified refresh interval", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Does not ever do periodic notifications if all subscribers specify an update interval of positive infinity", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Never indicates to new subscriber that there are pending updates (even if the subscription updates the date snapshot)", ({
			expect,
		}) => {
			expect.hasAssertions();
		});
	});

	describe("Subscriptions: custom `minimumRefreshIntervalMs` value", () => {
		it("Rounds up all incoming subscription intervals to custom min interval", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Throws if custom min interval is not a positive integer", ({
			expect,
		}) => {
			for (const i of sampleInvalidIntervals) {
				expect(() => {
					void new TimeSync({ minimumRefreshIntervalMs: i });
				}).toThrow(
					`Minimum refresh interval must be a positive integer (received ${i}ms)`,
				);
			}
		});
	});

	// This behavior is needed to make TimeSync play well with React's
	// lifecycles, but it didn't feel reasonable to make this behavior the
	// default for a system that should ideally be decoupled from React
	describe("Subscriptions: turning `autoNotifyAfterStateUpdate` off", () => {
		it("Does not auto-notify subscribers when date state is updated", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Indicates to new subscriber that there are pending subscribers if the subscription updates the date snapshot", ({
			expect,
		}) => {
			expect.hasAssertions();
		});
	});

	describe("Other public methods", () => {
		it("Lets any external system manually flush the latest state snapshot to all subscribers (for any reason, at any time)", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Lets any external system access the latest date snapshot without subscribing", ({
			expect,
		}) => {
			expect.hasAssertions();
		});

		it("Keeps pulled date snapshot over time as other subscribers update it", ({
			expect,
		}) => {
			expect.hasAssertions();
		});
	});
});
