import {BigNumber, ethers} from "ethers";
import {cli} from "cli-ux";

export function handleTypes(bindingName: string, value: any, type: string, internalType: string | undefined): void {
  switch (typeof value) {
    case "object": {
      if (value?._isBigNumber) {
        value = value.toString()
        handleString(bindingName, (value as BigNumber).toString(), type)
        break
      }

      if (value.length > 0) {
        handleArray(bindingName, value, type)
        break
      }

      if ("contract " + value.name != internalType) {
        cli.info("Unsupported type for - ", bindingName, " \n provided: ", value.name, "\n expected: ", internalType || "")
        cli.exit(0)
      }
      break
    }
    case "number": {
      if (!type.includes("int")) {
        cli.info("Unsupported type for - ", bindingName, " \n provided: number \n expected: ", type || "")
        cli.exit(0)
      }

      handleInt(bindingName, BigNumber.from(value), type)
      break
    }
    case "string": {
      handleString(bindingName, value, type)
      break
    }
    case "boolean": {
      if (!type.includes("bool")) {
        cli.info("Unsupported type for - ", bindingName, " \n provided: bool \n expected: ", type || "")
        cli.exit(0)
      }
      break
    }
    default: {
      cli.info("Unsupported type for - ", bindingName, " ", value)
      cli.exit(0)
    }
  }
}

function handleString(bindingName: string, value: string, type: string): void {
  // string
  if (type == "string") {
    return
  }

  // bytes
  if (type == "bytes") {
    return
  }

  // int
  if (type.includes("int")) {
    handleInt(bindingName, BigNumber.from(value), type)
    return
  }

  // address
  if (type.includes("address")) {
    if (!ethers.utils.isAddress(value)) {
      cli.info("Not valid address - ", bindingName, " \n provided length: ", value, " \n type: ", type)
      cli.exit(0)
    }
    return
  }
}

function handleArray(bindingName: string, values: string[], type: string): void {
  let arrayLength = 0

  const rawType = type.substring(0, type.indexOf("["))
  if (type.includes("[") && type.includes("]")) {
    arrayLength = +type.substring(type.indexOf("[") + 1, type.indexOf("]"))
  }

  // @TODO: handle handle length in multiple array dimension
  // if (values.length != arrayLength) {
  //   cli.info("Array out of range out of range - ", bindingName, " \n provided length: ", values.length.toString(), " \n type: ", arrayLength.toString())
  //   cli.exit(0)
  // }

  for (let value of values) {
    handleTypes(bindingName, value, type, type)
  }
}

function handleInt(bindingName: string, value: BigNumber, type: string) {
  if (value.lt(0) && type.includes("uint")) {
    cli.info("Unsupported type for - ", bindingName, " \n provided: negative number \n expected:", type || "")
    cli.exit(0)
  }

  const bits = type.substring(type.lastIndexOf("int") + 3)
  const unsigned = type.includes("uint")
  let range = BigNumber.from(1).mul(2).pow(bits).div(2)
  range = unsigned ? range.mul(2) : range
  range = range.sub(1)

  if (BigNumber.from(value).abs().gt(range)) {
    cli.info("Number out of range - ", bindingName, " \n provided: ", value.toString(), " \n type: ", type || "")
    cli.exit(0)
  }
}
