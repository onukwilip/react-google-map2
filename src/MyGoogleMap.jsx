import React, { memo, useCallback, useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  InfoWindow,
  useJsApiLoader,
  Marker,
  Autocomplete,
  DirectionsRenderer,
  MarkerClusterer,
} from "@react-google-maps/api";
import mapStyles from "./mapStyles";
import { formatRelative } from "date-fns";
import markerIcon from "./icons8-place-marker-96.png";
import userIcon from "./icons8-user-location-96.png";
import directionIcon from "./icons8-map-marker-94.png";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

const libraries = ["places"];

function MyMap() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_KEY,
    id: "google-map-script",
    libraries,
  });
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [initialPosition, setInitialPosition] = useState(null);
  const userRef = useRef();
  const [directionsService, setDirectionsService] = useState(null);
  const mapRef = useRef();

  const [mapIsLoaded, setMapIsLoaded] = useState(null);

  const onLoad = (map) => {
    mapRef.current = map;
  };
  const onUnmount = (map) => {};

  const mapContainerStyle = {
    width: "100vw",
    height: "100vh",
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            time: new Date(),
          });
          // console.log(`My current position is: `, position);
        },
        () => {
          setUserPosition({
            lat: 6.4487424,
            lng: 3.4504704,
            time: new Date(),
          });
          // console.log(`An error occurred `);
        }
      );
    } else {
      setUserPosition({
        lat: 6.4487424,
        lng: 3.4504704,
        time: new Date(),
      });
      // console.log(`My position was not allowed `);
    }
    // console.log(`My position was called: `);
  };

  const getInitialPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setInitialPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          return {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        },
        () => {
          setInitialPosition({
            lat: 6.4487424,
            lng: 3.4504704,
          });
          return {
            lat: 6.4487424,
            lng: 3.4504704,
          };
        }
      );
    } else {
      setInitialPosition({
        lat: 6.4487424,
        lng: 3.4504704,
      });
      return {
        lat: 6.4487424,
        lng: 3.4504704,
      };
    }
  };

  const addressFormatter = (result) => {
    const addressComponents = result?.address_components;
    let address = "";
    for (let i = 0; i < addressComponents?.length; i++) {
      if (i === addressComponents?.length - 1) {
        address += `${addressComponents[i]?.long_name}`;
        break;
      }
      address += `${addressComponents[i]?.long_name}, `;
    }
    return address;
  };

  const getGeocode = async (position, shouldFormatAddress) => {
    const geoCoder = new window.google.maps.Geocoder();
    const loc = position;
    const response = await geoCoder.geocode({ location: loc });
    console.log("Marker is long lat is:", loc);
    console.log("E is: ", position);
    console.log("Response is: ", response?.results);

    if (shouldFormatAddress) {
      return addressFormatter(response?.results[0]);
    }
    return response?.results[0]?.formatted_address;
  };

  const getDirection = async (userRef, e) => {
    const origin = await getGeocode(userRef?.current?.marker?.position, true);
    const destination = await getGeocode(e?.latLng);
    const directionsService = new window.google.maps.DirectionsService();
    console.log("Origin position: ", origin);
    console.log("Destination position: ", destination);

    const results = await directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    });
    // .catch((e) => {
    //   getDirection(userRef, e, true);
    // });
    console.log("Results", results);
    setDirectionsService(results);
  };

  const panTo = (position) => {
    mapRef.current?.panTo(position);
    mapRef.current?.setZoom(14);
  };

  useEffect(() => {
    getLocation();

    setInterval(() => {
      getLocation();
    }, [3000]);
  }, []);

  useEffect(() => {
    getInitialPosition();
    if (isLoaded) {
      setMapIsLoaded(true);
    }
  }, [isLoaded]);

  return (
    <div>
      {!isLoaded ? (
        <>
          <div>Loading...</div>
        </>
      ) : (
        <>
          <Search userPosition={userPosition} panTo={panTo} />
          <GoogleMap
            zoom={10}
            center={initialPosition}
            mapContainerStyle={mapContainerStyle}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{ styles: mapStyles }}
            onClick={(e) => {
              setMarkers((markers) => [
                ...markers,
                {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                  time: new Date(),
                },
              ]);
            }}
          >
            {markers.map((marker, i) => (
              <Marker
                position={{ lat: marker.lat, lng: marker.lng }}
                icon={{
                  url: markerIcon,
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
                key={i}
                onClick={(e) => {
                  setSelected(marker);
                  getDirection(userRef, e);
                }}
              />
            ))}

            {mapIsLoaded === true ? (
              <Marker
                position={{
                  lat: userPosition?.lat || 0,
                  lng: userPosition?.lng || 0,
                }}
                icon={{
                  url: userIcon,
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
                onClick={(e) => {
                  setSelected(userPosition);
                }}
                ref={userRef}
              />
            ) : null}
            {directionsService && (
              <DirectionsRenderer
                directions={directionsService}
                // options={{
                //   // suppressMarkers: true,
                //   markerOptions: {
                //     icon: directionIcon,
                //   },
                // }}
              ></DirectionsRenderer>
            )}
            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                onCloseClick={() => {
                  setSelected(null);
                }}
              >
                <div>
                  <h2>Location added</h2>
                  <p>Added at {formatRelative(selected.time, new Date())}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </>
      )}
    </div>
  );
}

const Search = (props) => {
  const [searchResults, setSearchResults] = useState(null);
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: {
        lat: () => props.userPosition?.lat,
        lng: () => props.userPosition?.lng,
      },
      radius: 800 * 1000,
    },
  });
  return (
    <div className="search">
      <Autocomplete
        onPlaceChanged={async () => {
          // console.log("PLACE", searchResults?.getPlace());
          const place = searchResults?.getPlace();
          const results = await getGeocode({
            address: place?.formatted_address,
          });
          const { lat, lng } = await getLatLng(results[0]);
          props.panTo({ lat, lng });
        }}
        onLoad={(autocomplete) => {
          setSearchResults(autocomplete);
        }}
      >
        <input type="text" placeholder="Search a place" name="search-input" />
      </Autocomplete>
      {/* <input
        type="text"
        placeholder="Search a place"
        onChange={(e) => {
          setValue(e.target.value);
        }}
        value={value}
        name="search-input"
      />
      <select
        name="search"
        onChange={async (e) => {
          const currValue = e.target.value;
          setValue(currValue);
          const results = await getGeocode({ address: currValue });
          const { lat, lng } = await getLatLng(results[0]);
          console.log("Current place is: ", currValue);
          console.log(`Current location is: ${lat} ${lng}`);
          props.panTo({ lat, lng });
        }}
        value={value}
      >
        {status &&
          data?.map(({ id, description }, i) => (
            <option value={description} key={i}>
              {description}
            </option>
          ))}
      </select> */}
    </div>
  );
};

export default memo(MyMap);
