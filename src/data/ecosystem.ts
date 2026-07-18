export interface Repo {
  name: string;
  description: string;
  category: 'Packager' | 'Reactor' | 'Sample' | 'Standard';
}

export const repos: Repo[] = [
  {
    name: 'capsium',
    description: 'The Ruby gem and CLI: pack, inspect, and serve Capsium packages.',
    category: 'Packager',
  },
  {
    name: 'capsium-js',
    description: 'TypeScript runtime for Capsium packages, with a service-worker reactor.',
    category: 'Packager',
  },
  {
    name: 'capsium-lua',
    description: 'Production reactor for nginx / OpenResty, with Docker images.',
    category: 'Reactor',
  },
  {
    name: 'capsium-webextension',
    description: 'Browser extension reactor for Chrome and Firefox — no server needed.',
    category: 'Reactor',
  },
  {
    name: 'cap-story',
    description: 'A sample Capsium package to explore and experiment with.',
    category: 'Sample',
  },
  {
    name: 'standards',
    description: 'The CC 62001 draft standard defining the Capsium architecture.',
    category: 'Standard',
  },
  {
    name: 'capsium.github.io',
    description: 'This website, built with Astro.',
    category: 'Sample',
  },
];

export function repoUrl(name: string): string {
  return `https://github.com/capsiums/${name}`;
}
