export const GET = async (context) => {
    return new Response(JSON.stringify({ message: 'GET request received' }), {
        headers: { 'Content-Type': 'application/json' },
    });
};

export const POST = async (context) => {
    return new Response(JSON.stringify({ message: 'POST request received' }), {
        headers: { 'Content-Type': 'application/json' },
    });
};

export const DELETE = async (context) => {
    return new Response(JSON.stringify({ message: 'DELETE request received' }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
