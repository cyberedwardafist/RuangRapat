import { RoomLoader } from './RoomLoader';

export const metadata = { title: 'Ruang meeting' };

export default function RuangPage({ params }: { params: { code: string } }) {
  return <RoomLoader code={params.code} />;
}
