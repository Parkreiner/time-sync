/**
 * @file This comment is here to provide clarity on why proxy objects might
 * always be a dead end for this library.
 *
 * Readonly dates need to have a lot of interoperability with native dates
 * (pretty much every JavaScript library uses the built-in type). So, this code
 * originally defined them as a Proxy wrapper over native dates. The handler
 * intercepted all methods prefixed with `set` and turned them into no-ops.
 *
 * That got really close to working, but then development ran into a critical
 * limitiation of the Proxy API. Basically, if the readonly date is defined with
 * a proxy, and you try to call Date.prototype.toISOString.call(readonlyDate),
 * that immediately blows up because the proxy itself is treated as the receiver
 * instead of the underlying native date.
 *
 * Vitest uses .call because it's the more airtight thing to do in most
 * situations, but proxy objects only have traps for .apply calls, not .call. So
 * there is no way in the language to intercept these calls and make sure
 * they're going to the right place.
 *
 * The good news, though, is that having an extended class might actually be the
 * better option, because it gives us the ability to define custom convenience
 * methods without breaking instanceof checks or breaking TypeScript
 * assignability for libraries that expect native dates. We just have to do a
 * little bit of extra work to fudge things for test runners.
 *
 * Not 100% sure on this, but proxies do also require reflection, which might've
 * had a risk of causing performance issues. Reflection could've ended up
 * breaking V8 engine optimizations by removing the ability to have monomorphic
 * code in some spots.
 */

/**
 * Any extra methods for readonly dates.
 *
 * (The main point of this comment is to add an extra boundary to make sure the
 * file comment above doesn't get bound to this interface definition.)
 */
interface ReadonlyDateApi {
	/**
	 * Converts a readonly date into a native (mutable) date.
	 */
	toDate(): Date;
}

/**
 * A readonly version of a Date object. To maximize compatibility with existing
 * libraries, all methods are the same as the native Date object at the type
 * level. But crucially, all methods prefixed with `set` have all mutation logic
 * removed.
 *
 * If you need a mutable version of the underlying date, readonly dates expose
 * a .toDate method.
 */
export class ReadonlyDate extends Date implements ReadonlyDateApi {
	// Very chaotic type signature, but that's an artifact of how wonky the
	// native Date type is. Using conditional types isn't great, because the
	// number of arguments you can pass in can vary so much, so we're going for
	// ugly constructor overloads
	constructor();
	constructor(initValue: number | string | Date);
	constructor(year: number, monthIndex: number);
	constructor(year: number, monthIndex: number, day: number);
	constructor(year: number, monthIndex: number, day: number, hours: number);
	constructor(
		year: number,
		monthIndex: number,
		day: number,
		hours: number,
		seconds: number,
	);
	constructor(
		year: number,
		monthIndex: number,
		day: number,
		hours: number,
		seconds: number,
		milliseconds: number,
	);
	constructor(
		initValue?: number | string | Date,
		monthIndex?: number,
		day?: number,
		hours?: number,
		minutes?: number,
		seconds?: number,
		milliseconds?: number,
	) {
		if (initValue === undefined) {
			super();
			return;
		}
		if (monthIndex === undefined) {
			super(initValue);
			return;
		}
		if (typeof initValue !== "number") {
			throw new TypeError(
				`Impossible case encountered: init value has type of '${typeof initValue}, but additional arguments were provided after the first`,
			);
		}

		/* biome-ignore lint:complexity/noArguments -- Native dates are super
		 * wonky, and they actually check arguments.length to define behavior
		 * at runtime. We can't pass all the arguments in via a single call,
		 * because then the constructor will create an invalid date the moment
		 * it finds any single undefined value.
		 *
		 * Note that invalid dates are still date objects, and basically behave
		 * like NaN. We're going to throw errors as much as we can to avoid
		 * those weird values from creeping into the library.
		 *
		 * This is a weird case where TypeScript won't be able to help us,
		 * because it has no concept of the arguments meta parameter in its type
		 * system. Brendan Eich's sins in 1995 are biting us 30 years later.
		 */
		const argCount = arguments.length;
		switch (argCount) {
			case 2: {
				super(initValue, monthIndex);
				return;
			}
			case 3: {
				super(initValue, monthIndex, day);
				return;
			}
			case 4: {
				super(initValue, monthIndex, day, hours);
				return;
			}
			case 5: {
				super(initValue, monthIndex, day, hours, minutes);
				return;
			}
			case 6: {
				super(initValue, monthIndex, day, hours, minutes, seconds);
				return;
			}
			case 7: {
				super(
					initValue,
					monthIndex,
					day,
					hours,
					minutes,
					seconds,
					milliseconds,
				);
				break;
			}
			default: {
				throw new Error(
					`Cannot instantiate new Date with ${argCount} arguments`,
				);
			}
		}
	}

	/**
	 * This is used to help fudge things a little bit in test runners like
	 * Vitest. They tend to look at the string tag associated with an object to
	 * decide how to process it, rather than going through the prototype chain.
	 *
	 * Vitest does this via Object.prototype.toString.call(value), which always
	 * gives back a string formatted like "[object ReadonlyDate]". Not sure what
	 * other options are available.
	 *
	 * Manually overriding the symbol method means that we can trick Vitest into
	 * processing readonly dates as native dates for testing. This technically
	 * does creep into the behavior exposed to end users, but most users are
	 * going to use instanceof, and that works in both of these checks:
	 * 1. value instanceof ReadonlyDate
	 * 2. value instanceof Date
	 */
	[Symbol.toStringTag](): string {
		return "Date";
	}

	toDate(): Date {
		// While you can do property accesses on super, which makes it look like
		// an object, it's technically not an object itself, so you can't use
		// super as a standalone value. We have to use super to pull a concrete
		// value from the underlying date in the prototype chain, and then make
		// a new date from that.
		const time = super.getTime();
		return new Date(time);
	}

	////////////////////////////////////////////////////////////////////////////
	// Start of custom set methods to shadow the ones from native dates. Note
	// that all set methods expect that the underlying timestamp be returned
	// afterwards, which always corresponds to Date.getTime.
	////////////////////////////////////////////////////////////////////////////

	setDate(_date: number): number {
		return super.getTime();
	}

	setFullYear(_year: number, _month?: number, _date?: number): number {
		return super.getTime();
	}

	setHours(_hours: number, _min?: number, _sec?: number, _ms?: number): number {
		return super.getTime();
	}

	setMilliseconds(_ms: number): number {
		return super.getTime();
	}

	setMinutes(_min: number, _sec?: number, _ms?: number): number {
		return super.getTime();
	}

	setMonth(_month: number, _date?: number): number {
		return super.getTime();
	}

	setSeconds(_sec: number, _ms?: number): number {
		return super.getTime();
	}

	setTime(_time: number): number {
		return super.getTime();
	}

	setUTCDate(_date: number): number {
		return super.getTime();
	}

	setUTCFullYear(_year: number, _month?: number, _date?: number): number {
		return super.getTime();
	}

	setUTCHours(
		_hours: number,
		_min?: number,
		_sec?: number,
		_ms?: number,
	): number {
		return super.getTime();
	}

	setUTCMilliseconds(_ms: number): number {
		return super.getTime();
	}

	setUTCMinutes(_min: number, _sec?: number, _ms?: number): number {
		return super.getTime();
	}

	setUTCMonth(_month: number, _date?: number): number {
		return super.getTime();
	}

	setUTCSeconds(_sec: number, _ms?: number): number {
		return super.getTime();
	}
}
