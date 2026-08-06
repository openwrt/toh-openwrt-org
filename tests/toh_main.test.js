import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadTohMain } from "./helpers/load-toh-main.js";

const toh = loadTohMain({
	toh_urls: { hwdata: "https://openwrt.org/toh/hwdata/" },
});

describe("_makeFirmwareProfileId", () => {
	it("builds the profile id from brand and model", () => {
		assert.equal(
			toh._makeFirmwareProfileId("avm:avm_fritzbox_4040"),
			"avm_fritzbox-4040",
		);
	});

	it("keeps every namespace of a multi-colon brand", () => {
		assert.equal(
			toh._makeFirmwareProfileId(
				"evaluation_boards:unbranded_boards:evaluation_boards_unbranded_boards_qualcomm_ap143_8m",
			),
			"evaluation_boards_unbranded_boards_qualcomm-ap143-8m",
		);
	});

	it("keeps the model as-is when it does not repeat the brand", () => {
		assert.equal(
			toh._makeFirmwareProfileId("acme:router_x1"),
			"acme_router-x1",
		);
	});
});

describe("_maketHwDataUrl", () => {
	it("turns every namespace colon into a path segment", () => {
		assert.equal(
			toh._maketHwDataUrl("avm:avm_fritzbox_4040"),
			"https://openwrt.org/toh/hwdata/avm/avm_fritzbox_4040",
		);
		assert.equal(
			toh._maketHwDataUrl("a:b:c"),
			"https://openwrt.org/toh/hwdata/a/b/c",
		);
	});
});

describe("formatLinkToHtml", () => {
	it("wraps http(s) urls in an anchor", () => {
		assert.equal(
			toh.formatLinkToHtml("https://openwrt.org/", "OpenWrt"),
			'<a href="https://openwrt.org/" target="_blank" title="https://openwrt.org/">OpenWrt</a>',
		);
	});

	it("honors target_blank=false", () => {
		assert.equal(
			toh.formatLinkToHtml("http://openwrt.org/", "x", false),
			'<a href="http://openwrt.org/" target="" title="http://openwrt.org/">x</a>',
		);
	});

	it("returns non-urls untouched", () => {
		assert.equal(toh.formatLinkToHtml("n/a"), "n/a");
	});
});

describe("_getFlashArrayBestValue", () => {
	it("passes through null and non-arrays", () => {
		assert.equal(toh._getFlashArrayBestValue(null), "");
		assert.equal(toh._getFlashArrayBestValue("16"), "16");
	});

	it("keeps the highest value of an array", () => {
		assert.equal(toh._getFlashArrayBestValue(["16", "32"]), 32);
	});

	it("ranks microSD as 128 GB", () => {
		assert.equal(toh._getFlashArrayBestValue(["microSD", "16"]), 131072);
	});

	it("ranks a lone eMMC as 1 MB", () => {
		assert.equal(toh._getFlashArrayBestValue(["eMMC"]), 1);
	});
});

describe("_getCleanNumber", () => {
	it("casts plain numbers", () => {
		assert.equal(toh._getCleanNumber("64"), 64);
	});

	it("keeps the max of a comma-separated list", () => {
		assert.equal(toh._getCleanNumber("64, 128, 256"), 256);
	});

	it("returns an empty string for null and blanks", () => {
		assert.equal(toh._getCleanNumber(null), "");
		assert.equal(toh._getCleanNumber("  "), "");
	});

	it("ranks GB ram just above its MB equivalent", () => {
		assert.equal(toh._getCleanNumber("4 GB", "ram"), 4097);
	});
});
