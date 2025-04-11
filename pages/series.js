import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SeriesForm from '../components/SeriesForm';

const SeriesPage = () => {
  const [series, setSeries] = useState([]);

  const addSeries = (newSeries) => {
    setSeries([...series, newSeries]);
  };

  const editSeries = (index, updatedSeries) => {
    const updatedSeriesList = series.map((s, i) => (i === index ? updatedSeries : s));
    setSeries(updatedSeriesList);
  };

  const deleteSeries = (index) => {
    const updatedSeriesList = series.filter((_, i) => i !== index);
    setSeries(updatedSeriesList);
  };

  return (
    <div>
      <Header />
      <main>
        <h1>Manage Series</h1>
        <SeriesForm onAddSeries={addSeries} />
        <div>
          {series.map((s, index) => (
            <div key={index}>
              <h2>{s.title}</h2>
              <p>{s.description}</p>
              <button onClick={() => editSeries(index, s)}>Edit</button>
              <button onClick={() => deleteSeries(index)}>Delete</button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SeriesPage;
