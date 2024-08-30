export const getUrlParams = () => {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    
    return params;
};
