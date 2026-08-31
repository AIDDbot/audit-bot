function currentDateTime(): Date {
  return new Date();
}

export function getHealthMessage(): string {
  return `the app is up and running (${currentDateTime().toISOString()})`;
}
