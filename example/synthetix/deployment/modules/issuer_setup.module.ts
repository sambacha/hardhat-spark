import {
  ContractBinding,
  buildModule,
  expectFuncRead,
  gracefulExpectFuncRead
} from 'ignition-core';
import { toBytes32 } from '../../util/util';
import { SynthetixModuleBuilder } from '../SynthetixModule';

export const SynthetixIssuerSetup = buildModule('SynthetixIssuerSetup', async (m: SynthetixModuleBuilder) => {
  const Issuer = m.Issuer;

  const synths = m.synths as {
    name: string,
    asset: string,
    subclass: string
  }[];
  const filteredSynths: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const {name: currencyKey} of synths) {
    const currencyKeyInBytes = toBytes32(currencyKey);
    const Synth = m.getBinding(`Synth${currencyKey}`);

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });
  }
  for (const Synth of synthsToAdd) {
    m.group(Issuer, Synth.synth).afterDeploy(m, `afterDeployIssuerForSynth${Synth.synth.name}`, async (): Promise<void> => {
      if (!await gracefulExpectFuncRead(Synth.synth, Issuer.deployed().synths, Synth.currencyKeyInBytes)) {
        filteredSynths.push(Synth);
      }
    });
  }

  const synthChunkSize = 15;

  for (let i = 0; i < filteredSynths.length; i += synthChunkSize) {
    const chunk = filteredSynths.slice(i, i + synthChunkSize);
    const chunkBindings = chunk.map(synth => synth.synth);

    m.group(Issuer, ...chunkBindings).afterDeploy(m, `afterDeployIssuerWithSynth${(i + synthChunkSize) / synthChunkSize}`, async (): Promise<void> => {
      await Issuer.deployed().addSynths([chunkBindings.map(synth => synth)]);
      await expectFuncRead(chunkBindings, Issuer.deployed().getSynths, [chunk.map(synth => synth.currencyKeyInBytes)]);
    });
  }
});
