import * as dotenv from "dotenv";
import { buildModule, ModuleBuilder } from "ignition-core";
import * as path from "path";

dotenv.config({ path: path.resolve(`${__dirname}./../.env`) });

export const DaiModule = buildModule("DaiModule", async (m: ModuleBuilder) => {
  m.contract("Dai", 1);
});
