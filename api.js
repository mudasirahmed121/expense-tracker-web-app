export const fetchExpenses = async () => {
  const response = await fetch(
    "https://jsonplaceholder.typicode.com/posts?_limit=5"
  );

  const data = await response.json();

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    amount: item.id * 100,
  }));
};