export async function POST(req: Request) {
  const { userId } = await req.json();

  // const addresses = await prisma.shippingAddress.findMany({
  //   where: { userId },
  // });

  return Response.json({
    addresses: [
      // temp mock
      {
        id: "1",
        name: "Home",
        line1: "123 Main St",
        city: "Charleston",
        state: "SC",
        postal: "29401",
      },
    ],
  });
}
