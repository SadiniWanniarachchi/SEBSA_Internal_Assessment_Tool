import * as React from "react";
import AdminQuestionsPage from "@/app/(admin)/admin/questions/page";

jest.mock("react", () => ({ ...jest.requireActual("react"), useState: jest.fn(), useRef: jest.fn(), useEffect: jest.fn() }));
jest.mock("@mui/material", () => Object.fromEntries([
  "Alert", "Box", "Button", "Card", "Chip", "CircularProgress", "Container", "Dialog", "DialogActions", "DialogContent",
  "DialogTitle", "Divider", "FormControl", "FormHelperText", "IconButton", "InputAdornment", "InputLabel", "MenuItem", "Select",
  "Stack", "Table", "TableBody", "TableCell", "TableContainer", "TableHead", "TableRow", "TextField", "Tooltip", "Typography",
].map((name) => [name, name])));
jest.mock("@mui/icons-material", () => Object.fromEntries([
  "AddOutlined", "EditOutlined", "QuizOutlined", "SearchOutlined", "ToggleOffOutlined", "ToggleOnOutlined",
].map((name) => [name, name])));

// Exercise the page's actual handlers and JSX with a deterministic hook store.
// This checks state transitions without adding a DOM dependency to this Node suite.
let state: any[];
let cursor: number;
let pending: { current: Set<string> };
const question = { id: "q1", questionText: "Sample question", category: null, status: "active", correctOption: "a" };
function render() {
  cursor = 0;
  return AdminQuestionsPage();
}
function find(node: any, predicate: (node: any) => boolean): any {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function toggle(tree = render()) {
  return find(tree, (node) => node.props?.role === "switch");
}
function response(data: unknown, ok = true) {
  return { ok, json: async () => data };
}
beforeEach(() => {
  state = []; cursor = 0; pending = { current: new Set() };
  (React.useState as jest.Mock).mockImplementation((initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = index === 0 ? [{ ...question }] : index === 1 ? false : initial;
    return [state[index], (next: any) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
  });
  (React.useRef as jest.Mock).mockReturnValue(pending);
  global.fetch = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test("active is green and inactive is red with an accessible switch state", () => {
  let control = toggle();
  expect(control.props.sx.color).toBe("#129B14");
  expect(control.props["aria-checked"]).toBe(true);
  expect(control.props["aria-label"]).toContain("Deactivate question");
  state[0][0].status = "inactive";
  control = toggle();
  expect(control.props.sx.color).toBe("#A30D0D");
  expect(control.props["aria-checked"]).toBe(false);
  expect(control.props["aria-label"]).toContain("Activate question");
});
test("updates immediately, prevents duplicate requests, and uses the persisted response", async () => {
  let finish!: (value: unknown) => void;
  (fetch as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const original = toggle();
  const update = original.props.onClick();
  expect(toggle().props.sx.color).toBe("#A30D0D");
  expect(toggle().props.disabled).toBe(true);
  await original.props.onClick();
  expect(fetch).toHaveBeenCalledTimes(1);
  finish(response({ success: true, data: { ...question, status: "inactive" } }));
  await update;
  expect(toggle().props["aria-checked"]).toBe(false);
  expect(toggle().props.disabled).toBe(false);
  expect(fetch).toHaveBeenCalledWith("/api/questions/q1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "inactive" }) }));
  // Reload: run the actual initial-load effect against the persisted GET response.
  (fetch as jest.Mock).mockResolvedValue(response({ success: true, data: [{ ...question, status: "inactive" }] }));
  state[0] = [];
  render();
  const effect = (React.useEffect as jest.Mock).mock.calls.at(-1)![0];
  effect();
  await new Promise((resolve) => setImmediate(resolve));
  expect(toggle().props.sx.color).toBe("#A30D0D");
});
test("failed updates restore the persisted color and display the server error", async () => {
  (fetch as jest.Mock)
    .mockResolvedValueOnce(response({ success: false, error: "Update was rejected." }, false))
    .mockResolvedValueOnce(response({ success: true, data: [question] }));
  await toggle().props.onClick();
  const tree = render();
  expect(toggle(tree).props.sx.color).toBe("#129B14");
  expect(toggle(tree).props.disabled).toBe(false);
  expect(find(tree, (node) => node.type === "Alert" && node.props.severity === "error").props.children).toBe("Update was rejected.");
});
test("reconciles a network failure after the server has committed the status", async () => {
  (fetch as jest.Mock)
    .mockRejectedValueOnce(new Error("Connection interrupted."))
    .mockResolvedValueOnce(response({ success: true, data: [{ ...question, status: "inactive" }] }));
  await toggle().props.onClick();
  expect(toggle().props.sx.color).toBe("#A30D0D");
});
