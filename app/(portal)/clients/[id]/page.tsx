import ClientDetailPage from "@/components/ClientDetailPage";
import { clientDetailDemoData } from "@/lib/clientDetailDemoData";

export default async function ClientPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const client =
    clientDetailDemoData.find(
      (item) => item.id === id
    );

  if (!client) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          padding: 30,
          borderRadius: 14,
          border: "1px solid #E5E7EB",
        }}
      >
        Client not found.
      </div>
    );
  }

  return (
    <ClientDetailPage
      client={client}
    />
  );
}