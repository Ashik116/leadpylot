type tHandleClick = {
    email: string,
    password: string,
}

const handleClick = async ({ email, password }: tHandleClick) => {
    await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
};

export { handleClick };