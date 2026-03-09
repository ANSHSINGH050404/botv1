const reset = "\x1b[0m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const dim = "\x1b[90m";
const red = "\x1b[31m";
const cyan = "\x1b[36m";

export const colors = {
  toolName: (name: string) => `${cyan}${name}${reset}`,
  fileName: (name: string) => `${yellow}${name}${reset}`,
  muted: (text: string) => `${dim}${text}${reset}`,
  error: (text: string) => `${red}${text}${reset}`,
  success: (text: string) => `${green}${text}${reset}`,
};
