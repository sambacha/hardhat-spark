// Empty file just to force ts to consider this a multi-root project.
// This means that dist/ will have both dist/src/ and dist/test/ instead
// of just compiling src/ into dist/

describe("ignition core", () => {
  describe("module resolver", () => {
    it("should be able to resolve single contract");
    it("should be able to resolve multiple contracts");
    it("should be able to resolve single contract and single event");
    it("should be able to resolve multiple contracts and multiple events");
    it("should be able to resolve custom deployFn");

    it("should be able to resolve onStart module events");
    it("should be able to resolve onCompletion module events");
    it("should be able to resolve onSuccess module events");
    it("should be able to resolve onError module events");

    describe("should be able to inject state file data in module object", () => {
      it("for contracts");
      it("for events");
    });
    describe("should be able to perform DI", () => {
      it("on ContractBindings");
      it("on StatefulEvent");
    });

    it("should be able to detect bytecode change");
    it("should be able to detect force flag");
    it(
      "should be able to invalidate contract dependant if redeploy is occurring"
    );
    it("should be able to detect shouldRedeploy function");

    it(
      "should fail if wrong order of elements is in state file compared to module object"
    );
    it(
      "should fail if module has wrong contract name compared to the state file"
    );
    it("should fail if module has wrong event type compared to the state file");
    it("should fail if module has wrong event name compared to the state file");
  });
});
