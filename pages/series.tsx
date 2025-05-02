import React, { useState } from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import SeriesForm from '../components/SeriesForm';

interface Series {
  title: string;
  description: string;
  [key: string]: any;
}

const SeriesPage: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);

  const addSeries = (newSeries: Series) => {
    setSeries([...series, newSeries]);
  };

  const editSeries = (index: number, updatedSeries: Series) => {
    const updatedSeriesList = series.map((s, i) => (i === index ? updatedSeries : s));
    setSeries(updatedSeriesList);
  };

  const deleteSeries = (index: number) => {
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