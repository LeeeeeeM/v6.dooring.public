import React, { memo, useEffect } from 'react'
import DataSet from '@antv/data-set'
import { Chart } from '@antv/g2'

import { HexagonalMapConfigType } from './schema'

interface HexagonalMapComponentProps extends HexagonalMapConfigType {
  id: string
}

const HexagonalMapComponent: React.FC<HexagonalMapComponentProps> = ({
  id, width, height,
}) => {
  const addPoint = (collection: any[], point: any, count = 1) => {
    for (let i = 0; i < count; i++) {
      collection.push(point)
    }
  }

  const getCount = (x: number, y: number, medianX: number, medianY: number) => {
    const distance = Math.pow((x - medianX), 2) + Math.pow((y - medianY), 2)
    if (distance < 4) {
      return 3
    } else if (distance < 16) {
      return 3
    } else if (distance < 64) {
      return 2
    }
    return 1
  }

  useEffect(() => {
      fetch('https://gw.alipayobjects.com/os/antvdemo/assets/data/china-provinces.geo.json')
        .then(res => res.json())
        .then(GeoJSON => {
          const geoDv = new DataSet.View().source(GeoJSON, {
            type: 'GeoJSON',
          })
          const ranges = {
            lat: geoDv.range('latitude'),
            lon: geoDv.range('longitude'),
          }
          const medians = {
            lat: geoDv.median('latitude'),
            lon: geoDv.median('longitude'),
          }

          const userData: any[] = []
          for (let lon = ranges.lon[0]; lon <= ranges.lon[1]; lon += 0.5) {
            for (let lat = ranges.lat[0]; lat <= ranges.lat[1]; lat += 0.5) {
              if (geoDv.geoContains(GeoJSON, [lon, lat])) {
                addPoint(userData, {
                  latitude: lat,
                  longitude: lon,
                }, getCount(lon, lat, medians.lon, medians.lat))
              }
            }
          }
          const userDv = new DataSet.View().source(userData).transform({
            // sizeByCount: true,
            type: 'bin.hexagon',
            fields: ['longitude', 'latitude'],
            binWidth: [2, 3],
            as: ['longitude', 'latitude', 'count'],
          })

          const chart = new Chart({
            container: `hexagonalMap-${id}`,
            autoFit: true,
            width,
            height,
          })
          chart.scale({
            latitude: { sync: true },
            longitude: { sync: true },
          })
          chart.legend(false)
          chart.axis(false)
          chart.tooltip(false)

          const geoView = chart.createView()
          geoView.data(geoDv.rows)
          geoView.polygon()
            .position('longitude*latitude')
            .color('grey')
            .style({
              opacity: 0.3,
            })

          const userView = chart.createView()
          userView.data(userDv.rows)
          userView.polygon()
            .position('longitude*latitude')
            .color('count', '#BAE7FF-#1890FF-#0050B3')
            .style({
              lineWidth: 10,
              stroke: 'white',
            })
          chart.render()
        })
  }, [])

  return <div id={`hexagonalMap-${id}`} />
}

export default memo(HexagonalMapComponent)
