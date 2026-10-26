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
  // connection() makes this a request-time Server Component. One shared instant
  // seeds SSR and hydration; the client clock advances only after mounting.
  // eslint-disable-next-line react-hooks/purity
  const initialNow = Date.now();
  return <Board initialState={initialState} initialIssue={initialIssue} initialNow={initialNow} />;
}
