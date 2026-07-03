import RunningForm from "./running-form";

// 서버 컴포넌트: URL의 ?date= 를 읽어 폼에 초기 날짜로 전달
export default async function RunningPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <RunningForm initialDate={typeof date === "string" ? date : undefined} />;
}
