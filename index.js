const {withUiHook, htm} = require('@zeit/integration-utils')
const rp = require('request-promise')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

const saveLog = async ({ ingestionKey }) => {
  const result = await rp({
    method: 'POST',
    uri: 'https://logs.logdna.com/logs/ingest',
		qs: {
		  hostname: 'ZEIT_HOST',
			mac: 'C0:FF:EE:C0:FF:EE',
			ip: '10.0.1.101',
			now:'1559433833746'
		},
		auth: {
		  user: ingestionKey
		},
    body: {
		  lines: [
			  {
				  timestamp: 1559433833746,
					line: "test",
					file: "zeit.log"
				}
			]
    },
    json: true,
  })
  return { result: result }
}

module.exports = withUiHook(async ({payload, zeitClient}) => {
	const {clientState, action, projectId} = payload;
  const store = await zeitClient.getMetadata();

  if (!projectId) {
    return htm`
      <Page>
        <Notice type="warn">Please select a project to configure logDNA.</Notice>
        <ProjectSwitcher />
      </Page>
    `
  }

	if (action === 'submit') {
		store.ingestionKey = clientState.ingestionKey;
		await zeitClient.setMetadata(store);
	}

	if (action === 'reset') {
		store.ingestionKey = '';
		await zeitClient.setMetadata(store);
	}

  try{
    if(action === 'saveLogs'){
      try {
        const x = await saveLog({ ingestionKey: store.ingestionKey })
      } catch (err) {
        console.error(err)
        throwDisplayableError({ message: 'There was an error sending log.' })
      }  		
	  }
  } catch (err) {
    console.error(err)
    throwDisplayableError({ message: 'There was an error sending log.' })
  }  		

	let apiDeployments = `/v4/now/deployments?limit=10`;
	if (projectId) {
		apiDeployments += `&projectId=${projectId}`
	}

	const {deployments} = await zeitClient.fetchAndThrow(apiDeployments, {method: 'GET'});
	console.log('start ------------------------------')
	console.log(deployments)
	console.log('end ------------------------------')
	const urls = deployments.map(d => `https://${d.url}`)

	return htm`
		<Page>
			<Container>
        <Select name="deploymentUrl" value="selectedValue" action="changeDeployment">
				  ${urls.map(u => htm`<Option value=${u} caption=${u} />`)}
        </Select>			
			</Container>
			<Container>
				<Input label="Ingestion key" name="ingestionKey" value=${store.ingestionKey || ''} />
			</Container>
			<Container>
				<Button action="submit">Submit</Button>
				<Button action="reset">Reset</Button>
			</Container>

      ${store.ingestionKey ?
        htm`<Box display="flex" justifyContent="space-between">
          <Button action="saveLogs">Save logs in LogDNA</Button>
        </Box>` 
			: 
				''
			}
		</Page>
	`
})
