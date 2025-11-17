import { describe, it } from "vitest";
import { useTimeSync, useTimeSyncRef } from "./useTimeSync";

describe.concurrent(useTimeSyncRef.name, () => {
	describe("General behavior", () => {
		it.todo("Throws if mounted outside of a TimeSyncProvider", ({ expect }) => {
			expect.hasAssertions();
		});
	});
});

describe.concurrent(useTimeSync.name, () => {
	describe("General behavior", () => {
		it.todo("Throws if mounted outside of a TimeSyncProvider", ({ expect }) => {
			expect.hasAssertions();
		});
	});

	describe("Single consumer", () => {
		describe("No transformation callback", () => {
			it.todo("Returns a new Date synchronously on mount", ({ expect }) => {
				expect.hasAssertions();
			});
		});

		describe("With transformation callback", () => {
			it.todo(
				"Returns callback result synchronously on mount",
				({ expect }) => {
					expect.hasAssertions();
				},
			);
		});
	});

	describe("Multiple consumers on screen at same time", () => {
		it.todo(
			"Refreshes previous consumers when new consumer mounts",
			({ expect }) => {
				expect.hasAssertions();
			},
		);
	});
});
