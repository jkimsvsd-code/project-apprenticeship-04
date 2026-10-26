import { connection } from 'next/server';
import { Board } from '../board/Board';
import { readBoard } from '../server/readings';
import { ConfigurationError } from '../server/database';

export default async function Home() {
  await connection();
  let initialState = null;
  let initialIssue: 'configuration' | 'storage' | null = null;
  try {
    initialState = await readBoard();
  } catch (error) {
    initialIssue = error instanceof ConfigurationError ? 'configuration' : 'storage';
  }
  return <Board initialState={initialState} initialIssue={initialIssue} />;
}
