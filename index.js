const {withUiHook, htm} = require('@zeit/integration-utils')
const rp = require('request-promise')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

const saveLog = async ({ ingestionKey }) => {
  const result = await rp({
    method: 'POST',
    uri: 'https://logs.logdna.com/logs/ingest',
		qs: {
		  hostname: 'EXAMPLE_HOST',
			mac: 'C0:FF:EE:C0:FF:EE',
			ip: '10.0.1.101',
			now:'1559493833746'
		},
		auth: {
		  user: ingestionKey
		},
    body: {
		  lines: [
			  {
				  timestamp: 1559493833746,
					line: "test 001",
					file: "example.log"
				}
			]
    },
    json: true,
  })
  return { result: result }
}

module.exports = withUiHook(async ({payload, zeitClient}) => {
	const {clientState, action} = payload;
	const store = await zeitClient.getMetadata();

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

	return htm`
		<Page>
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
