import { renderHook } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { useEffectEvent } from "./useEffectEventPolyfill";

function renderUseEffectEvent<TArgs extends unknown[], TReturn = unknown>(
	callbackArg: (...args: TArgs) => TReturn,
) {
	type Callback = typeof callbackArg;
	type Props = Readonly<{ callback: Callback }>;
	return renderHook<Callback, Props>(
		({ callback }) => useEffectEvent(callback),
		{ initialProps: { callback: callbackArg } },
	);
}

describe.concurrent(useEffectEvent.name, () => {
	it("Should maintain a stable reference across all renders", ({ expect }) => {
		const callback = vi.fn();
		const { result, rerender } = renderUseEffectEvent(callback);

		const firstResult = result.current;
		for (let i = 0; i < 5; i++) {
			rerender({ callback });
		}
		expect(result.current).toBe(firstResult);
	});

	it("Should always call the most recent callback passed in", ({ expect }) => {
		const mockCallback1 = vi.fn();
		const mockCallback2 = vi.fn();

		const { result, rerender } = renderUseEffectEvent(mockCallback1);
		rerender({ callback: mockCallback2 });

		result.current();
		expect(mockCallback1).not.toBeCalled();
		expect(mockCallback2).toBeCalledTimes(1);
	});
});
