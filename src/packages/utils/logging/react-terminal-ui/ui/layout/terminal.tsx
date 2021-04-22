import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import { ContractBinding, StatefulEvent } from '../../../../../../interfaces/hardhat_ignition';
import { ElementStatus, ElementWithStatus } from '../../index';
import Spinner from 'ink-spinner';
import { Props } from 'ink/build/components/Box';
import chalk from 'chalk';
import { checkIfExist } from '../../../../util';

export const TerminalLayout = ({
                                 showDeployment,
                                 ignitionVersion,
                                 moduleName,
                                 numberOfExecutedElements,
                                 totalNumberOfElements,
                                 moduleElementsWithStatus,
                                 transactionStatus,
                                 summary,
                               }) => {

  useEffect(() => {
  }, []);

  return (
    <>
      <Text>
        <Newline/>
        Hardhat Ignition <Text>{ignitionVersion}</Text>
        <Newline/>
      </Text>
      {showDeployment ? (
        <>
          <Text>Deploying {moduleName} <Text>{
            Math.round(numberOfExecutedElements / totalNumberOfElements * 100)
          }%</Text></Text>
          <ModuleElements
            moduleElementsWithStatus={moduleElementsWithStatus}
          />
        </>
      ) : (
        <></>
      )
      }
      <Text>Status: {transactionStatus}</Text>
      {!checkIfEmptySummary(summary) ? (
        <Text>{summary}</Text>
      ) : (<></>)
      }
    </>
  );
};

function ModuleElements({
                          moduleElementsWithStatus
                        }) {

  const formattedModuleElements =
    Object.values(moduleElementsWithStatus)
      .filter((
        elementWithStatus: ElementWithStatus
      ) => {
        if (
          elementWithStatus.status != ElementStatus.EMPTY
        ) {
          return true;
        }
      });

  const mappedModuleElements = {};
  Object.values(formattedModuleElements).map((value: ElementWithStatus) => {
    value.element = value.element as ContractBinding;
    const subModule = (value.element.subModuleNameDepth || []).join(' > ');
    if (!checkIfExist(mappedModuleElements[subModule])) {
      mappedModuleElements[subModule] = [];
    }

    mappedModuleElements[subModule].push(value);
  });

  return (
    <>
      {Object.keys(mappedModuleElements).map((subModuleNameDepth: string) => (
        <Box flexDirection={'column'} key={subModuleNameDepth}>
          <SubModuleElements
            subModuleDepth={subModuleNameDepth}
            moduleElements={mappedModuleElements[subModuleNameDepth]}
          />
        </Box>
      ))
      }
    </>
  );
}

function SubModuleElements({
                             subModuleDepth,
                             moduleElements
                           }) {
  return (
    <>
      {(subModuleDepth != '') ? (
        <Text> {'>'} {subModuleDepth}</Text>
      ) : (<></>)
      }
      {Object.values(moduleElements).map((elementWithStatus: ElementWithStatus, index) => (
        <Text key={fetchName(elementWithStatus.element)}>    {
          !((elementWithStatus.element as StatefulEvent)._isStatefulEvent) ?
            ContractComponent(elementWithStatus.element as ContractBinding, elementWithStatus.status) :
            EventComponent(elementWithStatus.element as StatefulEvent, elementWithStatus.status)
        }
        </Text>
      ))
      }
    </>
  );
}

function ContractComponent(element: ContractBinding, status: ElementStatus) {
  return <Text>{chalk.blue(element.name)} {getStatus(status)}</Text>;
}

function EventComponent(element: StatefulEvent, status: ElementStatus) {
  return <Text>  {chalk.yellow(element.event.name)} {getStatus(status)}</Text>;
}

function fetchName(element: (ContractBinding | StatefulEvent)) {
  if ((element as ContractBinding)._isContractBinding) {
    return (element as ContractBinding).name;
  }

  return (element as StatefulEvent).event.name;
}

function checkIfEmptySummary(summary: string): boolean {
  return summary == '';
}

function getStatus(elementStatus: ElementStatus): boolean | Props {
  switch (elementStatus) {
    case ElementStatus.EMPTY: {
      return false;
    }
    case ElementStatus.IN_PROGRESS: {
      return <Spinner type={'dots'}/>;
    }
    case ElementStatus.SUCCESSFULLY: {
      return <Text color={'green'}> ✓</Text>;
    }
  }

  return false;
}
