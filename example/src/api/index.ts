export const GET = async (context) => {
    return new Response(JSON.stringify({ message: 'GET request received', url: context.request.url }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
