export default function AdminDisputes() {
  const disputes = [
    { id: "1", reason: "not_received", status: "open" },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dispute Review</h1>

      <div className="space-y-3 mt-4">
        {disputes.map((d) => (
          <div key={d.id} className="border p-4 rounded">
            <p>ID: {d.id}</p>
            <p>Reason: {d.reason}</p>
            <p>Status: {d.status}</p>

            <button className="bg-green-500 text-white px-3 py-1 rounded mr-2">
              Approve Refund
            </button>
            <button className="bg-red-500 text-white px-3 py-1 rounded">
              Reject
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
