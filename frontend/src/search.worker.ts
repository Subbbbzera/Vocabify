export {};

self.onmessage = ({ data: { words, query, filter = 'all' } }) => {
  const searchTerm = query.trim().toLowerCase();

  const result = words.map(([letter, list]: [string, any[]]) => {
    const filteredList = list.filter(word => {

      if (filter === 'favorite' && !word.isFavorite) return false;
      if (filter === 'important' && !word.important) return false;
      if (filter === 'remembered' && !word.remembered) return false;
      if (filter === 'unlearned' && word.remembered) return false;

      if (!searchTerm) return true;

      return (
        word.text.toLowerCase().includes(searchTerm) ||
        word.translate.toLowerCase().includes(searchTerm) ||
        word.extraForms?.some((f: string) => f.toLowerCase().includes(searchTerm))
      );
    });
    return [letter, filteredList];
  }).filter(([_, list]: [any, any[]]) => list.length > 0);

  self.postMessage(result);
};
