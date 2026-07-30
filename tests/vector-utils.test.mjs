import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../app/utils.ts",import.meta.url),"utf8");
const js=ts.transpile(source,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}).replace('require("./types");',"");
const mod={exports:{}};vm.runInNewContext(`(function(exports,module){${js}})(mod.exports,mod)`,{mod});
const {isValidCoordinates,parseCoordinateLine,interpolatePosition,validateScenario}=mod.exports;
test("validates coordinate limits",()=>{assert.equal(isValidCoordinates(59.9,10.7),true);assert.equal(isValidCoordinates(91,0),false);assert.equal(parseCoordinateLine("59.9139, 10.7522").lat,59.9139)});
test("interpolates smoothly",()=>{const p=interpolatePosition([{lat:0,lng:0},{lat:10,lng:20}],.5);assert.equal(p.lat,5);assert.equal(p.lng,10)});
test("validates scenario import",()=>assert.equal(validateScenario({name:"Test",position:{lat:1,lng:2},route:[{lat:1,lng:2}]}),true));
