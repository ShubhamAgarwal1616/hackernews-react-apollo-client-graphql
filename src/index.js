import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';

import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { BrowserRouter } from 'react-router-dom';
import { setContext } from 'apollo-link-context'
import {AUTH_TOKEN} from "./constants";

import { split } from 'apollo-link'
import { WebSocketLink } from 'apollo-link-ws'
import { getMainDefinition } from 'apollo-utilities'

const httpLink = createHttpLink({
  uri: 'http://localhost:4000'
})

//apollo-link-context is a middleware we are using to add authentication header in every apollo client request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(AUTH_TOKEN)
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})


/*
There’s a currently a bug in the apollo-link-ws package that will prevent your app from running due to the following error:
  Module not found: Can't resolve 'subscriptions-transport-ws' in
  '/.../hackernews-react-apollo/node_modules/apollo-link-ws/lib' The workaround until it’s fixed is to manually install
  the subscriptions-transport-ws package with yarn add subscriptions-transport-ws
*/


//apollo-link-ws and subscriptions-transport-ws packages are used to add a middleware for subscription events of graphql in apollo client

/*
We’re instantiating a WebSocketLink that knows the subscriptions endpoint. The subscriptions endpoint in this case is similar to the HTTP endpoint, except that it uses the ws instead of http protocol. Notice that We’re also authenticating the websocket connection with the user’s token that you retrieve from localStorage.
*/

const wsLink = new WebSocketLink({
  uri: `ws://localhost:4000`,
  options: {
    reconnect: true,
    connectionParams: {
      authToken: localStorage.getItem(AUTH_TOKEN),
    }
  }
})

/*
split is used to “route” a request to a specific middleware link. It takes three arguments, the first one is a test function which returns a boolean. The remaining two arguments are again of type ApolloLink. If test returns true, the request will be forwarded to the link passed as the second argument. If false, to the third one.
*/

/*
In this case, the test function is checking whether the requested operation is a subscription. If this is the case, it will be forwarded to the wsLink, otherwise (if it’s a query or mutation), the authLink.concat(httpLink) will take care of it:
 */

const link = split(
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query)
    return kind === 'OperationDefinition' && operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink)
)

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
})

ReactDOM.render(
  <BrowserRouter>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </BrowserRouter>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
