import { ContractBinding, ContractEvent, ModuleBuilder } from '../mortar';
import { expectFuncRead } from './expectancy';

export const mutator = async (
  m: ModuleBuilder,
  name: string,
  setter: ContractBinding,
  setterFunc: string,
  getterFunc: string,
  writeArgs: any[],
  readArgs: any[],
  expectedValue: any
): Promise<ContractEvent> => {
  const usages: (ContractBinding | ContractEvent)[] = [];
  for (const arg of writeArgs) {
    if (arg instanceof ContractBinding || arg instanceof ContractBinding) {
      usages.push(arg);
    }
  }

  return m.group(setter).afterDeploy(m, name, async (): Promise<void> => {
    await setter.instance()[`${setterFunc}`](...writeArgs);

    await expectFuncRead(expectedValue, setter.instance()[`${getterFunc}`], ...readArgs);
  }, ...usages);
};
