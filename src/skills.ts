type SkillRule = { label: string; pattern: RegExp }

// This lightweight matcher is transparent and runs locally; the list can grow as
// we see real job descriptions. Keep specific terms ahead of broad ones.
const skillRules: SkillRule[] = [
  { label: 'C++', pattern: /(?:^|[^a-z0-9])c\+\+(?=$|[^a-z0-9])/i },
  { label: 'C#', pattern: /(?:^|[^a-z0-9])c#(?=$|[^a-z0-9])/i },
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'JavaScript', pattern: /\bjavascript\b/i },
  { label: 'Python', pattern: /\bpython\b/i },
  { label: 'Java', pattern: /\bjava\b/i },
  { label: 'Rust', pattern: /\brust\b/i },
  { label: 'Go', pattern: /\b(?:golang|go programming|go language)\b/i },
  { label: 'SQL', pattern: /\bsql\b/i },
  { label: 'Bash', pattern: /\bbash\b/i },
  { label: 'React', pattern: /\breact(?:\.js)?\b/i },
  { label: 'Node.js', pattern: /\bnode(?:\.js|js)\b/i },
  { label: 'HTML', pattern: /\bhtml5?\b/i },
  { label: 'CSS', pattern: /\bcss3?\b/i },
  { label: 'REST APIs', pattern: /\brest(?:ful)? (?:api|apis)\b/i },
  { label: 'GraphQL', pattern: /\bgraphql\b/i },
  { label: 'AWS', pattern: /\baws\b|amazon web services/i },
  { label: 'Azure', pattern: /\bazure\b/i },
  { label: 'Google Cloud', pattern: /\b(?:gcp|google cloud)\b/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Kubernetes', pattern: /\b(?:kubernetes|k8s)\b/i },
  { label: 'Terraform', pattern: /\bterraform\b/i },
  { label: 'CI/CD', pattern: /\bci\s*\/\s*cd\b|continuous integration|continuous delivery/i },
  { label: 'Git', pattern: /\bgit\b/i },
  { label: 'Linux', pattern: /\blinux\b/i },
  { label: 'Embedded systems', pattern: /\bembedded systems?\b/i },
  { label: 'Firmware', pattern: /\bfirmware\b/i },
  { label: 'RTOS', pattern: /\brtos\b|real.time operating systems?/i },
  { label: 'FreeRTOS', pattern: /\bfreertos\b/i },
  { label: 'ARM', pattern: /\barm(?: cortex)?\b/i },
  { label: 'Microcontrollers', pattern: /\bmicrocontrollers?\b|\bmcus?\b/i },
  { label: 'SPI', pattern: /\bspi\b/i },
  { label: 'I2C', pattern: /\bi[²2]c\b/i },
  { label: 'UART', pattern: /\buart\b/i },
  { label: 'CAN bus', pattern: /\bcan bus\b|\bcan protocol\b/i },
  { label: 'CMake', pattern: /\bcmake\b/i },
  { label: 'Jenkins', pattern: /\bjenkins\b/i },
  { label: 'Agile', pattern: /\bagile\b/i },
  { label: 'Scrum', pattern: /\bscrum\b/i },
]

export function extractSkills(text: string): string[] {
  return skillRules
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label)
}

