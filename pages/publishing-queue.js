// ...other imports
import AirtableIntegration from '../components/AirtableIntegration';

const PublishingQueuePage = () => {
  const [content, setContent] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/content');
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <div>
      <h1>Pre-Publishing Queue</h1>
      {error && <p>Error: {error}</p>}
      <PlatformConnectors content={content} />
      {/* Only show AirtableIntegration if content has loaded and there's no error */}
      {!loading && !error && content.length > 0 && <AirtableIntegration />}
    </div>
  );
};

export default PublishingQueuePage;
