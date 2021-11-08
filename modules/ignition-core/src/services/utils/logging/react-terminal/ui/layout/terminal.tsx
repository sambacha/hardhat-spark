import chalk from "chalk";
import { cli } from "cli-ux";
import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect } from "react";

import {
  ContractBinding,
  ContractEvent,
  StatefulEvent,
} from "../../../../../../interfaces/hardhat-ignition";
import { ElementStatus, ElementWithStatus } from "../../../../../types/logger";
import { checkIfExist } from "../../../../util";

export const TerminalLayout = ({
  showDeployment,
  ignitionVersion,
  moduleName,
  numberOfExecutedElements,
  totalNumberOfElements,
  moduleElementsWithStatus,
  transactionStatus,
  summary,
  errorMessage = "",
  errorStack = "",
}: {
  showDeployment: boolean;
  ignitionVersion: string;
  moduleName: string;
  numberOfExecutedElements: number;
  totalNumberOfElements: number;
  moduleElementsWithStatus: { [key: string]: ElementWithStatus };
  transactionStatus: string;
  summary: string;
  errorMessage?: string;
  errorStack?: string;
}) => {
  useEffect(() => {}, []);

  return (
    <>
      <Text>
        <Newline />
        Hardhat Ignition <Text>{ignitionVersion}</Text>
        <Newline />
      </Text>
      {showDeployment ? (
        <>
          <Text>
            Deploying {moduleName}{" "}
            <Text>
              {Math.round(
                (numberOfExecutedElements / totalNumberOfElements) * 100
              )}
              %
            </Text>
          </Text>
          <ModuleElements moduleElementsWithStatus={moduleElementsWithStatus} />
          {checkIfEmpty(summary) ? (
            <Text>Status: {transactionStatus}</Text>
          ) : (
            <></>
          )}
        </>
      ) : (
        <></>
      )}
      {!checkIfEmpty(summary) ? <Text>{summary}</Text> : <></>}
      {!checkIfEmpty(errorMessage) ? <Text>{errorMessage}</Text> : <></>}
      {!(checkIfEmpty(errorStack) && cli.config.outputLevel === "debug") ? (
        <Text>{errorStack}</Text>
      ) : (
        <></>
      )}
    </>
  );
};

function ModuleElements({
  moduleElementsWithStatus,
}: {
  moduleElementsWithStatus: { [key: string]: ElementWithStatus };
}) {
  const formattedModuleElements = Object.values(
    moduleElementsWithStatus
  ).filter((elementWithStatus: ElementWithStatus) => {
    if (elementWithStatus.status !== ElementStatus.EMPTY) {
      return true;
    }
  });

  const mappedModuleElements: { [key: string]: ElementWithStatus[] } = {};
  Object.values(formattedModuleElements).map((value: ElementWithStatus) => {
    if ((value.element as ContractBinding)._isContractBinding) {
      value.element = value.element as ContractBinding;
      const subModule = value.element.subModuleNameDepth.join(" > ");
      if (!checkIfExist(mappedModuleElements[subModule])) {
        mappedModuleElements[subModule] = [];
      }

      mappedModuleElements[subModule].push(value);
    }

    if ((value.element as StatefulEvent)._isStatefulEvent) {
      value.element = value.element as StatefulEvent;
      const subModule = (
        (value.element?.event as ContractEvent)?.subModuleNameDepth ?? []
      ).join(" > ");
      if (!checkIfExist(mappedModuleElements[subModule])) {
        mappedModuleElements[subModule] = [];
      }

      mappedModuleElements[subModule].push(value);
    }
  });

  return (
    <>
      {Object.keys(mappedModuleElements).map((subModuleNameDepth: string) => (
        <Box flexDirection={"column"} key={subModuleNameDepth}>
          <SubModuleElements
            subModuleDepth={subModuleNameDepth}
            moduleElements={mappedModuleElements[subModuleNameDepth]}
          />
        </Box>
      ))}
    </>
  );
}

function SubModuleElements({
  subModuleDepth,
  moduleElements,
}: {
  subModuleDepth: string;
  moduleElements: ElementWithStatus[];
}) {
  return (
    <>
      {subModuleDepth !== "" ? (
        <Text>
          {" "}
          {">"} {subModuleDepth}
        </Text>
      ) : (
        <></>
      )}
      {Object.values(moduleElements).map(
        (elementWithStatus: ElementWithStatus, index) => (
          <Text key={fetchName(elementWithStatus.element)}>
            {" "}
            {!(elementWithStatus.element as StatefulEvent)._isStatefulEvent
              ? ContractComponent(
                  elementWithStatus.element as ContractBinding,
                  elementWithStatus.status
                )
              : EventComponent(
                  elementWithStatus.element as StatefulEvent,
                  elementWithStatus.status
                )}
          </Text>
        )
      )}
    </>
  );
}

function ContractComponent(element: ContractBinding, status: ElementStatus) {
  return (
    <Text>
      {chalk.blue(element.name)} {getStatus(status)}
    </Text>
  );
}

function EventComponent(element: StatefulEvent, status: ElementStatus) {
  return (
    <Text>
      {" "}
      {chalk.yellow(element.event.name)} {getStatus(status)}
    </Text>
  );
}

function fetchName(element: ContractBinding | StatefulEvent) {
  if ((element as ContractBinding)._isContractBinding) {
    return (element as ContractBinding).name;
  }

  return (element as StatefulEvent).event.name;
}

function checkIfEmpty(data: string): boolean {
  return data === "";
}

function getStatus(elementStatus: ElementStatus): boolean | JSX.Element {
  switch (elementStatus) {
    case ElementStatus.EMPTY: {
      return false;
    }
    case ElementStatus.IN_PROGRESS: {
      return <Spinner type={"dots"} />;
    }
    case ElementStatus.SUCCESSFULLY: {
      return <Text color={"green"}> ✓</Text>;
    }
  }

  return false;
}
