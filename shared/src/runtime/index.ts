// The unified exercise runtime: one session/prompt lifecycle, one clock, one
// input model, one answer collector, and one scorer interface that every
// exercise family runs through. Framework-free; browser transport and input
// adapters live in the app layer.

export * from "./input";
export * from "./transport";
export * from "./promptMachine";
export * from "./sessionMachine";
export * from "./answerCollector";
export * from "./scorer";
